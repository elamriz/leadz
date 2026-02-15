import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { textSearch, placeDetails, extractDomain, estimateCost } from '@/lib/google-maps';
import { trackRequest, checkDailyCap, checkMonthlyCap, getOrCreateCaps } from '@/lib/usage-tracker';
import { deduplicateLead } from '@/lib/dedup';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            query,
            location,
            latitude,
            longitude,
            radiusKm = 50,
            maxResults = 60,
            dryRun = false,
        } = body;

        if (!query || !latitude || !longitude) {
            return NextResponse.json(
                { error: 'Missing required fields: query, latitude, longitude' },
                { status: 400 }
            );
        }

        const caps = await getOrCreateCaps();

        // Calculate estimates
        const estimatedSearchRequests = Math.min(
            Math.ceil(maxResults / 20),
            caps.perRunSearchLimit,
            caps.maxPaginationDepth
        );
        const estimatedDetailRequests = Math.min(maxResults, caps.perRunDetailLimit);
        const costEstimate = estimateCost(
            estimatedSearchRequests,
            estimatedDetailRequests,
            caps.searchCostPer1000,
            caps.detailCostPer1000
        );

        // Dry run mode — just return estimates
        if (dryRun) {
            return NextResponse.json({
                dryRun: true,
                estimates: {
                    searchRequests: estimatedSearchRequests,
                    detailRequests: estimatedDetailRequests,
                    maxPlaces: Math.min(maxResults, caps.perRunMaxPlaces),
                    ...costEstimate,
                },
            });
        }

        // Check daily caps
        const searchCap = await checkDailyCap('search');
        const detailCap = await checkDailyCap('detail');
        const monthlySearchCap = await checkMonthlyCap('search');
        const monthlyDetailCap = await checkMonthlyCap('detail');

        const warnings: string[] = [];
        if (searchCap.warning) warnings.push(searchCap.warning);
        if (detailCap.warning) warnings.push(detailCap.warning);
        if (monthlySearchCap.warning) warnings.push(monthlySearchCap.warning);
        if (monthlyDetailCap.warning) warnings.push(monthlyDetailCap.warning);

        if (!searchCap.allowed || !monthlySearchCap.allowed) {
            return NextResponse.json(
                { error: 'Search API daily/monthly cap reached', warnings },
                { status: 429 }
            );
        }

        // Create search run
        const run = await prisma.searchRun.create({
            data: {
                query,
                location: location || `${latitude},${longitude}`,
                latitude,
                longitude,
                radiusKm,
                maxResults: Math.min(maxResults, caps.perRunMaxPlaces),
                maxSearchRequests: caps.perRunSearchLimit,
                maxDetailRequests: caps.perRunDetailLimit,
                maxPaginationDepth: caps.maxPaginationDepth,
                status: 'running',
                startedAt: new Date(),
            },
        });

        // Execute search
        const allPlaces = [];
        let pageToken: string | undefined;
        let searchRequestCount = 0;
        const errors: string[] = [];

        for (let page = 0; page < caps.maxPaginationDepth; page++) {
            // Check per-run limits
            if (searchRequestCount >= caps.perRunSearchLimit) break;
            if (allPlaces.length >= caps.perRunMaxPlaces) break;

            // Check daily cap before each request
            const capCheck = await checkDailyCap('search');
            if (!capCheck.allowed) {
                errors.push('Daily search cap reached mid-run');
                break;
            }

            try {
                const result = await textSearch({
                    query,
                    latitude,
                    longitude,
                    radiusKm,
                    maxResults: 20,
                    pageToken,
                });

                searchRequestCount++;
                await trackRequest('search', 1);

                allPlaces.push(...result.places);
                pageToken = result.nextPageToken;

                if (!pageToken) break;
            } catch (error) {
                errors.push(`Search page ${page + 1}: ${error instanceof Error ? error.message : 'Unknown'}`);
                break;
            }
        }

        // Process places → leads
        let detailRequestCount = 0;
        let newLeads = 0;
        let duplicates = 0;
        const leadIds: string[] = [];

        for (const place of allPlaces) {
            if (detailRequestCount >= caps.perRunDetailLimit) break;
            if (leadIds.length >= caps.perRunMaxPlaces) break;

            // Check daily detail cap
            const detailCapCheck = await checkDailyCap('detail');
            if (!detailCapCheck.allowed) {
                errors.push('Daily detail cap reached mid-run');
                break;
            }

            try {
                // Get details if needed (we might already have them from search)
                let placeData = place;
                if (!place.nationalPhoneNumber && !place.websiteUri) {
                    placeData = await placeDetails(place.id);
                    detailRequestCount++;
                    await trackRequest('detail', 1);
                }

                // Deduplicate
                const dedup = await deduplicateLead(
                    placeData.id,
                    placeData.websiteUri,
                    placeData.nationalPhoneNumber
                );

                if (dedup.isDuplicate && dedup.existingLead) {
                    duplicates++;
                    // Link existing lead to this run
                    await prisma.searchRunLead.create({
                        data: {
                            searchRunId: run.id,
                            leadId: dedup.existingLead.id,
                            isDuplicate: true,
                        },
                    });
                    leadIds.push(dedup.existingLead.id);
                    continue;
                }

                // Create new lead
                const domain = placeData.websiteUri ? extractDomain(placeData.websiteUri) : null;
                const lead = await prisma.lead.create({
                    data: {
                        placeId: placeData.id,
                        displayName: placeData.displayName?.text || 'Unknown Business',
                        formattedAddress: placeData.formattedAddress,
                        nationalPhone: placeData.nationalPhoneNumber,
                        websiteUri: placeData.websiteUri,
                        websiteDomain: domain,
                        rating: placeData.rating,
                        userRatingCount: placeData.userRatingCount,
                        businessStatus: placeData.businessStatus,
                        types: placeData.types || [],
                        latitude: placeData.location?.latitude,
                        longitude: placeData.location?.longitude,
                        niche: query,
                    },
                });

                newLeads++;
                leadIds.push(lead.id);

                await prisma.searchRunLead.create({
                    data: {
                        searchRunId: run.id,
                        leadId: lead.id,
                    },
                });
            } catch (error) {
                errors.push(`Place ${place.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
        }

        // Update run
        const finalCost = estimateCost(searchRequestCount, detailRequestCount, caps.searchCostPer1000, caps.detailCostPer1000);
        await prisma.searchRun.update({
            where: { id: run.id },
            data: {
                status: 'completed',
                totalPlacesFound: allPlaces.length,
                totalNewLeads: newLeads,
                totalDuplicates: duplicates,
                searchRequests: searchRequestCount,
                detailRequests: detailRequestCount,
                estimatedCost: finalCost.totalCost,
                errors,
                completedAt: new Date(),
            },
        });

        return NextResponse.json({
            run: {
                id: run.id,
                status: 'completed',
                totalPlacesFound: allPlaces.length,
                totalNewLeads: newLeads,
                totalDuplicates: duplicates,
                searchRequests: searchRequestCount,
                detailRequests: detailRequestCount,
                estimatedCost: finalCost.totalCost,
                errors,
            },
            warnings,
            leadIds,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET runs history
export async function GET() {
    try {
        const runs = await prisma.searchRun.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                _count: { select: { leads: true } },
            },
        });

        return NextResponse.json({ runs });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

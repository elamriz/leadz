import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { extractEmails, auditWebsite } from '@/lib/email-extractor';
import { calculateScore, DEFAULT_WEIGHTS, type ScoringInput } from '@/lib/scoring';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { leadIds, enrichAll = false } = body;

        let leads;
        if (enrichAll) {
            leads = await prisma.lead.findMany({
                where: {
                    websiteUri: { not: null },
                    emails: { none: {} },
                },
                take: 50,
            });
        } else if (leadIds && Array.isArray(leadIds)) {
            leads = await prisma.lead.findMany({
                where: { id: { in: leadIds } },
            });
        } else {
            return NextResponse.json({ error: 'Provide leadIds[] or set enrichAll: true' }, { status: 400 });
        }

        const results = [];

        for (const lead of leads) {
            const result: Record<string, unknown> = {
                leadId: lead.id,
                displayName: lead.displayName,
                emailsFound: 0,
                websiteAudited: false,
                scored: false,
                errors: [] as string[],
            };

            // Extract emails
            if (lead.websiteUri) {
                try {
                    const emails = await extractEmails(lead.websiteUri);
                    for (const email of emails) {
                        try {
                            await prisma.leadEmail.create({
                                data: {
                                    leadId: lead.id,
                                    email: email.email,
                                    source: email.source,
                                    confidence: email.confidence,
                                    isGeneric: email.isGeneric,
                                },
                            });
                            result.emailsFound = (result.emailsFound as number) + 1;
                        } catch {
                            // Email already exists (unique constraint)
                        }
                    }

                    // Update lead status if emails found
                    if (emails.length > 0) {
                        await prisma.lead.update({
                            where: { id: lead.id },
                            data: { status: 'READY' },
                        });
                    }
                } catch (error) {
                    (result.errors as string[]).push(`Email extraction: ${error instanceof Error ? error.message : 'Unknown'}`);
                }

                // Website audit
                try {
                    const audit = await auditWebsite(lead.websiteUri);
                    result.websiteAudited = true;

                    const auditData = {
                        hasWebsite: true,
                        isAccessible: audit.isAccessible,
                        httpsPresent: audit.httpsPresent,
                        mobileFriendly: audit.mobileFriendly,
                        loadTimeMs: audit.loadTimeMs,
                        hasTitle: audit.hasTitle,
                        hasDescription: audit.hasDescription,
                        hasMetaTags: audit.hasMetaTags,
                        outdatedTech: audit.outdatedTech,
                        emailFound: (result.emailsFound as number) > 0,
                        phoneFound: !!lead.nationalPhone,
                        ratingValue: lead.rating,
                        reviewCount: lead.userRatingCount,
                        isOperational: lead.businessStatus === 'OPERATIONAL',
                        // Deep audit fields
                        htmlSizeBytes: audit.htmlSizeBytes,
                        scriptCount: audit.scriptCount,
                        stylesheetCount: audit.stylesheetCount,
                        hasLazyImages: audit.hasLazyImages,
                        inlineStyleCount: audit.inlineStyleCount,
                        imageCount: audit.imageCount,
                        imagesWithoutAlt: audit.imagesWithoutAlt,
                        hasResponsiveImages: audit.hasResponsiveImages,
                        usesTables: audit.usesTables,
                        hasFavicon: audit.hasFavicon,
                        hasSemanticHtml: audit.hasSemanticHtml,
                        usesDefaultFonts: audit.usesDefaultFonts,
                        hasFlash: audit.hasFlash,
                        hasOgTags: audit.hasOgTags,
                        hasStructuredData: audit.hasStructuredData,
                        hasCanonical: audit.hasCanonical,
                        hasH1: audit.hasH1,
                        multipleH1: audit.multipleH1,
                        titleLength: audit.titleLength,
                        oldDoctype: audit.oldDoctype,
                        oldCmsDetected: audit.oldCmsDetected,
                        designScore: audit.designScore,
                        seoScore: audit.seoScore,
                        performanceScore: audit.performanceScore,
                        techScore: audit.techScore,
                    };

                    await prisma.scoringSignal.upsert({
                        where: { leadId: lead.id },
                        update: { ...auditData, calculatedAt: new Date() },
                        create: { leadId: lead.id, ...auditData },
                    });

                    const scoringInput: ScoringInput = {
                        hasWebsite: true,
                        isAccessible: audit.isAccessible,
                        websiteUri: lead.websiteUri,
                        rating: lead.rating,
                        userRatingCount: lead.userRatingCount,
                        businessStatus: lead.businessStatus,
                        nationalPhone: lead.nationalPhone,
                        emailFound: (result.emailsFound as number) > 0,
                        httpsPresent: audit.httpsPresent,
                        mobileFriendly: audit.mobileFriendly,
                        loadTimeMs: audit.loadTimeMs,
                        hasMetaTags: audit.hasMetaTags,
                        outdatedTech: audit.outdatedTech,
                        // Deep audit sub-scores
                        designScore: audit.designScore,
                        seoScore: audit.seoScore,
                        performanceScore: audit.performanceScore,
                        techScore: audit.techScore,
                        // Deep audit individual signals
                        hasH1: audit.hasH1,
                        hasOgTags: audit.hasOgTags,
                        hasStructuredData: audit.hasStructuredData,
                        hasCanonical: audit.hasCanonical,
                        hasFavicon: audit.hasFavicon,
                        hasSemanticHtml: audit.hasSemanticHtml,
                        usesDefaultFonts: audit.usesDefaultFonts,
                        usesTables: audit.usesTables,
                        hasFlash: audit.hasFlash,
                        oldDoctype: audit.oldDoctype,
                        oldCmsDetected: audit.oldCmsDetected,
                        htmlSizeBytes: audit.htmlSizeBytes,
                        scriptCount: audit.scriptCount,
                        imageCount: audit.imageCount,
                        imagesWithoutAlt: audit.imagesWithoutAlt,
                    };

                    // Load scoring config
                    let weights = DEFAULT_WEIGHTS;
                    const config = await prisma.scoringConfig.findFirst({ where: { isActive: true } });
                    if (config) {
                        weights = {
                            noWebsiteWeight: config.noWebsiteWeight ?? DEFAULT_WEIGHTS.noWebsiteWeight,
                            designScoreWeight: config.designScoreWeight ?? DEFAULT_WEIGHTS.designScoreWeight,
                            seoScoreWeight: config.seoScoreWeight ?? DEFAULT_WEIGHTS.seoScoreWeight,
                            performanceScoreWeight: config.performanceScoreWeight ?? DEFAULT_WEIGHTS.performanceScoreWeight,
                            techScoreWeight: config.techScoreWeight ?? DEFAULT_WEIGHTS.techScoreWeight,
                            highRatingWeight: config.highRatingWeight ?? DEFAULT_WEIGHTS.highRatingWeight,
                            highRatingThreshold: config.highRatingThreshold ?? DEFAULT_WEIGHTS.highRatingThreshold,
                            reviewCountWeight: config.reviewCountWeight ?? DEFAULT_WEIGHTS.reviewCountWeight,
                            reviewCountThreshold: config.reviewCountThreshold ?? DEFAULT_WEIGHTS.reviewCountThreshold,
                            highReviewCountWeight: config.highReviewCountWeight ?? DEFAULT_WEIGHTS.highReviewCountWeight,
                            highReviewCountThreshold: config.highReviewCountThreshold ?? DEFAULT_WEIGHTS.highReviewCountThreshold,
                            hasPhoneWeight: config.hasPhoneWeight ?? DEFAULT_WEIGHTS.hasPhoneWeight,
                            emailFoundWeight: config.emailFoundWeight ?? DEFAULT_WEIGHTS.emailFoundWeight,
                            recentContactPenalty: config.recentContactPenalty ?? DEFAULT_WEIGHTS.recentContactPenalty,
                        };
                    }

                    const scoreResult = calculateScore(scoringInput, weights);
                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: {
                            score: scoreResult.score,
                            topReasons: scoreResult.topReasons,
                        },
                    });
                    result.scored = true;
                    result.score = scoreResult.score;
                } catch (error) {
                    (result.errors as string[]).push(`Website audit: ${error instanceof Error ? error.message : 'Unknown'}`);
                }
            } else {
                // No website — still calculate score
                const scoringInput: ScoringInput = {
                    hasWebsite: false,
                    rating: lead.rating,
                    userRatingCount: lead.userRatingCount,
                    businessStatus: lead.businessStatus,
                    nationalPhone: lead.nationalPhone,
                    emailFound: false,
                };

                let weights = DEFAULT_WEIGHTS;
                const config = await prisma.scoringConfig.findFirst({ where: { isActive: true } });
                if (config) {
                    weights = {
                        noWebsiteWeight: config.noWebsiteWeight ?? DEFAULT_WEIGHTS.noWebsiteWeight,
                        designScoreWeight: config.designScoreWeight ?? DEFAULT_WEIGHTS.designScoreWeight,
                        seoScoreWeight: config.seoScoreWeight ?? DEFAULT_WEIGHTS.seoScoreWeight,
                        performanceScoreWeight: config.performanceScoreWeight ?? DEFAULT_WEIGHTS.performanceScoreWeight,
                        techScoreWeight: config.techScoreWeight ?? DEFAULT_WEIGHTS.techScoreWeight,
                        highRatingWeight: config.highRatingWeight ?? DEFAULT_WEIGHTS.highRatingWeight,
                        highRatingThreshold: config.highRatingThreshold ?? DEFAULT_WEIGHTS.highRatingThreshold,
                        reviewCountWeight: config.reviewCountWeight ?? DEFAULT_WEIGHTS.reviewCountWeight,
                        reviewCountThreshold: config.reviewCountThreshold ?? DEFAULT_WEIGHTS.reviewCountThreshold,
                        highReviewCountWeight: config.highReviewCountWeight ?? DEFAULT_WEIGHTS.highReviewCountWeight,
                        highReviewCountThreshold: config.highReviewCountThreshold ?? DEFAULT_WEIGHTS.highReviewCountThreshold,
                        hasPhoneWeight: config.hasPhoneWeight ?? DEFAULT_WEIGHTS.hasPhoneWeight,
                        emailFoundWeight: config.emailFoundWeight ?? DEFAULT_WEIGHTS.emailFoundWeight,
                        recentContactPenalty: config.recentContactPenalty ?? DEFAULT_WEIGHTS.recentContactPenalty,
                    };
                }

                const scoreResult = calculateScore(scoringInput, weights);

                await prisma.scoringSignal.upsert({
                    where: { leadId: lead.id },
                    update: {
                        hasWebsite: false,
                        phoneFound: !!lead.nationalPhone,
                        ratingValue: lead.rating,
                        reviewCount: lead.userRatingCount,
                        isOperational: lead.businessStatus === 'OPERATIONAL',
                        calculatedAt: new Date(),
                    },
                    create: {
                        leadId: lead.id,
                        hasWebsite: false,
                        phoneFound: !!lead.nationalPhone,
                        ratingValue: lead.rating,
                        reviewCount: lead.userRatingCount,
                        isOperational: lead.businessStatus === 'OPERATIONAL',
                    },
                });

                await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        score: scoreResult.score,
                        topReasons: scoreResult.topReasons,
                    },
                });
                result.scored = true;
                result.score = scoreResult.score;
            }

            results.push(result);
        }

        return NextResponse.json({
            enriched: results.length,
            results,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

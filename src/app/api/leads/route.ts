import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSearchKeywords } from '@/lib/niches';

// GET leads with filters, sorting, and pagination
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '25');
        const sortBy = searchParams.get('sortBy') || 'score';
        const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
        const status = searchParams.get('status');
        const niche = searchParams.get('niche');
        const search = searchParams.get('search');
        const hasEmail = searchParams.get('hasEmail');
        const minScore = searchParams.get('minScore');
        const maxScore = searchParams.get('maxScore');
        const tags = searchParams.get('tags');
        const smartList = searchParams.get('smartList');

        // Build filter
        const where: Record<string, unknown> = {};

        if (status) where.status = status;
        if (niche) {
            const keywords = getSearchKeywords(niche);
            if (keywords.length > 0) {
                where.AND = [
                    ...(where.AND as Array<Record<string, unknown>> || []),
                    {
                        OR: keywords.map(k => ({ niche: { contains: k, mode: 'insensitive' } }))
                    }
                ];
            } else {
                where.niche = { contains: niche, mode: 'insensitive' };
            }
        }

        if (search) {
            where.OR = [
                { displayName: { contains: search, mode: 'insensitive' } },
                { formattedAddress: { contains: search, mode: 'insensitive' } },
                { websiteDomain: { contains: search, mode: 'insensitive' } },
                { nationalPhone: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (hasEmail === 'true') {
            where.emails = { some: {} };
        } else if (hasEmail === 'false') {
            where.emails = { none: {} };
        }

        if (minScore) where.score = { ...(where.score as Record<string, unknown> || {}), gte: parseInt(minScore) };
        if (maxScore) where.score = { ...(where.score as Record<string, unknown> || {}), lte: parseInt(maxScore) };

        if (tags) {
            where.tags = { hasSome: tags.split(',') };
        }

        const groupId = searchParams.get('groupId');
        if (groupId) {
            where.groups = { some: { id: groupId } };
        }

        // Smart lists
        if (smartList) {
            switch (smartList) {
                case 'never_contacted':
                    where.status = 'NEW';
                    where.lastContactedAt = null;
                    break;
                case 'ready':
                    where.status = 'READY';
                    where.emails = { some: {} };
                    break;
                case 'follow_up':
                    where.status = 'FOLLOW_UP';
                    break;
                case 'do_not_contact':
                    where.status = 'DO_NOT_CONTACT';
                    break;
                case 'missing_email':
                    where.emails = { none: {} };
                    break;
                case 'high_priority':
                    where.score = { gte: 60 };
                    where.status = { in: ['NEW', 'READY'] };
                    break;
                case 'no_website':
                    where.websiteUri = null;
                    break;
                case 'contacted':
                    where.status = { in: ['SENT', 'REPLIED', 'NOT_INTERESTED', 'FOLLOW_UP'] };
                    break;
            }
        }

        const [leads, totalCount] = await Promise.all([
            prisma.lead.findMany({
                where,
                include: {
                    emails: true,
                    _count: { select: { campaignSends: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.lead.count({ where }),
        ]);

        return NextResponse.json({
            leads,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST create lead manually
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { displayName, formattedAddress, nationalPhone, websiteUri, niche, notes, tags } = body;

        if (!displayName) {
            return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
        }

        const lead = await prisma.lead.create({
            data: {
                displayName,
                formattedAddress,
                nationalPhone,
                websiteUri,
                websiteDomain: websiteUri ? new URL(websiteUri.startsWith('http') ? websiteUri : `https://${websiteUri}`).hostname.replace(/^www\./, '') : null,
                niche,
                notes,
                tags: tags || [],
            },
            include: { emails: true },
        });

        return NextResponse.json({ lead }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

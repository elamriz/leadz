import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all campaigns
export async function GET() {
    try {
        const campaigns = await prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                template: { select: { id: true, name: true } },
                _count: {
                    select: { sends: true },
                },
            },
        });

        return NextResponse.json({ campaigns });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST create campaign
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('Campaign creation payload:', JSON.stringify(body, null, 2)); // Debug payload
        const {
            name,
            subject,
            templateId,
            templateIds = [],
            niche,
            channel = 'email',
            language = 'fr',
            senderName,
            senderNames = [],
            noWebsiteOnly = false,
            dailyLimit = 50,
            minDelaySeconds = 5,
            maxDelaySeconds = 45,
            cooldownDays = 30,
            safeSendMode = true,
            smartSending = false,
            selectedLeadIds = [],
        } = body;

        if (!name) {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        // Subject is optional when using template rotation or smart sending (subject comes from templates)
        const effectiveSubject = subject || '(from template)';

        const campaign = await prisma.campaign.create({
            data: {
                name,
                subject: effectiveSubject,
                templateId,
                templateIds,
                niche,
                channel,
                language,
                senderName,
                senderNames,
                noWebsiteOnly,
                dailyLimit,
                minDelaySeconds,
                maxDelaySeconds,
                cooldownDays,
                safeSendMode,
                smartSending,
                selectedLeadIds,
            },
            include: { template: true },
        });

        return NextResponse.json({ campaign }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

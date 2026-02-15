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
        const {
            name,
            subject,
            templateId,
            niche,
            channel = 'email',
            noWebsiteOnly = false,
            dailyLimit = 50,
            minDelaySeconds = 5,
            maxDelaySeconds = 45,
            cooldownDays = 30,
            safeSendMode = true,
        } = body;

        if (!name || !subject) {
            return NextResponse.json({ error: 'name and subject are required' }, { status: 400 });
        }

        const campaign = await prisma.campaign.create({
            data: {
                name,
                subject,
                templateId,
                niche,
                channel,
                noWebsiteOnly,
                dailyLimit,
                minDelaySeconds,
                maxDelaySeconds,
                cooldownDays,
                safeSendMode,
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

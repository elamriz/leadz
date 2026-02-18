import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET single campaign
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: { template: true },
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        return NextResponse.json({ campaign });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE campaign
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.campaign.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH update campaign
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const {
            name,
            subject,
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
        } = body;

        const campaign = await prisma.campaign.update({
            where: { id },
            data: {
                name,
                subject,
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
            },
        });

        return NextResponse.json({ campaign });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
    // Only allow in development or with a secret key
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV !== 'development' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('Starting lead status sync...');

        const leads = await prisma.lead.findMany({
            where: {
                status: { in: ['NEW', 'READY', 'QUEUED', 'SENT', 'BOUNCED'] },
                campaignSends: { some: {} },
            },
            include: {
                campaignSends: {
                    orderBy: { createdAt: 'desc' }, // Get most recent send
                    take: 1,
                },
            },
        });

        console.log(`Found ${leads.length} leads with campaign sends to check.`);

        let updatedCount = 0;
        const updates = [];

        for (const lead of leads) {
            if (!lead.campaignSends || lead.campaignSends.length === 0) continue;

            const latestSend = lead.campaignSends[0];
            let newStatus: LeadStatus | null = null;

            if (latestSend.status === 'REPLIED') {
                newStatus = 'REPLIED';
            } else if (latestSend.status === 'SENT' || latestSend.status === 'OPENED' || latestSend.status === 'CLICKED') {
                newStatus = 'SENT';
            } else if (latestSend.status === 'BOUNCED' || latestSend.status === 'FAILED') {
                newStatus = 'BOUNCED';
            }

            if (newStatus && newStatus !== lead.status) {
                updates.push(
                    prisma.lead.update({
                        where: { id: lead.id },
                        data: { status: newStatus },
                    })
                );
                console.log(`Will update lead ${lead.displayName} from ${lead.status} to ${newStatus}`);
                updatedCount++;
            }
        }

        if (updates.length > 0) {
            await prisma.$transaction(updates);
        }

        console.log(`Finished sync. Updated ${updatedCount} leads.`);

        return NextResponse.json({
            success: true,
            message: `Finished sync. Updated ${updatedCount} leads.`,
            updatedCount
        });

    } catch (error) {
        console.error('Error in sync script:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

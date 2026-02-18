import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSmtpConfig } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: NextRequest,
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

        // 1. Get local DB stats (Sent/Queued/Failed counts are reliable here)
        const dbStats = await prisma.campaignSend.groupBy({
            by: ['status'],
            where: { campaignId: id },
            _count: { _all: true },
        });

        const counts = {
            queued: 0,
            sent: 0,
            failed: 0,
            bounced: 0,
            opened: 0,
            replied: 0,
        };

        dbStats.forEach(s => {
            const c = s._count._all;
            if (s.status === 'QUEUED') counts.queued = c;
            if (s.status === 'SENT') counts.sent = c;
            if (s.status === 'FAILED') counts.failed = c;
            if (s.status === 'BOUNCED') counts.bounced = c;
            if (s.status === 'OPENED') counts.opened = c;
            if (s.status === 'REPLIED') counts.replied = c;
        });

        // 2. Fetch Brevo Stats (for Opens, Clicks, Bounces)
        // We use the tag = campaign.id to filter
        // API: https://developers.brevo.com/reference/getaggregatedsmtpreport

        const config = await getSmtpConfig();
        if (config.apiKey) {
            try {
                // Prepare date range (campaign creation to now)
                const startDate = campaign.createdAt.toISOString().split('T')[0];
                const endDate = new Date().toISOString().split('T')[0];

                const url = new URL('https://api.brevo.com/v3/smtp/statistics/reports');
                url.searchParams.append('tag', id);
                url.searchParams.append('startDate', startDate);
                url.searchParams.append('endDate', endDate);

                const res = await fetch(url.toString(), {
                    headers: { 'api-key': config.apiKey },
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.reports && data.reports.length > 0) {
                        // Aggregate reports (usually 1 per day)
                        let brevoOpened = 0;
                        let brevoClicked = 0; // we don't store clicked in DB Campaign model, but useful to return
                        let brevoBounced = 0; // Hard bounces
                        let brevoBlocked = 0; // Soft bounces/spam blocks

                        data.reports.forEach((r: any) => {
                            brevoOpened += (r.uniqueOpens || 0); // or r.opens?
                            brevoClicked += (r.uniqueClicks || 0);
                            brevoBounced += (r.hardBounces || 0);
                            brevoBlocked += (r.blocked || 0) + (r.softBounces || 0);
                        });

                        // Update local Campaign stats if different
                        // We do NOT update CampaignSend individual rows here (too expensive to exact match),
                        // but we update the Campaign aggregate counters.
                        if (
                            campaign.totalOpened !== brevoOpened ||
                            campaign.totalBounced !== (brevoBounced + brevoBlocked)
                        ) {
                            await prisma.campaign.update({
                                where: { id },
                                data: {
                                    totalOpened: brevoOpened,
                                    totalBounced: brevoBounced + brevoBlocked,
                                    // We can't easily sync totalReplied from Brevo (it doesn't know replies),
                                    // that has to come from IMAP sync or webhook, which we don't have yet.
                                    // So we keep DB value for replied.
                                }
                            });

                            // Update return object
                            counts.opened = brevoOpened;
                            counts.bounced = brevoBounced + brevoBlocked;
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch Brevo stats:', err);
                // Continue with DB stats
            }
        }

        return NextResponse.json({
            jobStatus: campaign.jobStatus,
            jobTotal: campaign.jobTotal,
            stats: counts,
            breakdown: dbStats // raw breakdown useful for debugging/detailed UI
        });

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

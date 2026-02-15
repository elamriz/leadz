import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const [
            totalLeads,
            statusCounts,
            enrichedCount,
            avgScore,
            nicheBreakdown,
            recentRuns,
            campaignStats,
            recentSends,
        ] = await Promise.all([
            prisma.lead.count(),
            prisma.lead.groupBy({
                by: ['status'],
                _count: true,
            }),
            prisma.lead.count({
                where: { emails: { some: {} } },
            }),
            prisma.lead.aggregate({
                _avg: { score: true },
            }),
            prisma.lead.groupBy({
                by: ['niche'],
                _count: true,
                orderBy: { _count: { niche: 'desc' } },
                take: 10,
            }),
            prisma.searchRun.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    query: true,
                    location: true,
                    totalNewLeads: true,
                    totalDuplicates: true,
                    estimatedCost: true,
                    createdAt: true,
                    status: true,
                },
            }),
            prisma.campaign.aggregate({
                _sum: {
                    totalSent: true,
                    totalFailed: true,
                    totalBounced: true,
                    totalReplied: true,
                },
            }),
            prisma.campaignSend.groupBy({
                by: ['status'],
                _count: true,
            }),
        ]);

        const statusMap: Record<string, number> = {};
        statusCounts.forEach((s: { status: string; _count: number }) => { statusMap[s.status] = s._count; });

        const sendStatusMap: Record<string, number> = {};
        recentSends.forEach((s: { status: string; _count: number }) => { sendStatusMap[s.status] = s._count; });

        return NextResponse.json({
            overview: {
                totalLeads,
                enriched: enrichedCount,
                avgScore: Math.round(avgScore._avg.score || 0),
                contacted: statusMap['SENT'] || 0,
                replied: statusMap['REPLIED'] || 0,
                newLeads: statusMap['NEW'] || 0,
                ready: statusMap['READY'] || 0,
                doNotContact: statusMap['DO_NOT_CONTACT'] || 0,
            },
            statusBreakdown: statusMap,
            nicheBreakdown: nicheBreakdown.map((n: { niche: string | null; _count: number }) => ({
                niche: n.niche || 'Unknown',
                count: n._count,
            })),
            recentRuns,
            campaigns: {
                totalSent: campaignStats._sum.totalSent || 0,
                totalFailed: campaignStats._sum.totalFailed || 0,
                totalBounced: campaignStats._sum.totalBounced || 0,
                totalReplied: campaignStats._sum.totalReplied || 0,
            },
            sendStatusBreakdown: sendStatusMap,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

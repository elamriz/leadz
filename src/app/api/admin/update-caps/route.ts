import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        let caps = await prisma.apiUsageCap.findFirst({ where: { isActive: true } });
        if (!caps) {
            caps = await prisma.apiUsageCap.create({ data: {} });
        }

        const updated = await prisma.apiUsageCap.update({
            where: { id: caps.id },
            data: {
                perRunSearchLimit: 100,    // Adaptive grid needs ~12-50 cells per city run
                perRunDetailLimit: 200,    // Details only fetched when data is missing
                perRunMaxPlaces: 300,      // Up to 300 unique leads per run
                maxPaginationDepth: 3,     // Google provides at most 3 pages anyway
                dailySearchLimit: 5000,    // Daily limit 5,000
                dailyDetailLimit: 5000,    // Daily limit 5,000
                monthlySearchLimit: 50000, // Monthly limit 50,000
                monthlyDetailLimit: 50000, // Monthly limit 50,000
            }
        });

        return NextResponse.json({ success: true, caps: updated });

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const leads = await prisma.lead.findMany({
            where: {
                status: 'READY'
            },
            include: {
                campaignSends: true
            }
        });

        let withSends = 0;
        const examples = [];

        for (const lead of leads) {
            if (lead.campaignSends && lead.campaignSends.length > 0) {
                withSends++;
                examples.push({
                    id: lead.id,
                    name: lead.displayName,
                    status: lead.status,
                    sends: lead.campaignSends.map(s => s.status)
                });
            }
        }

        return NextResponse.json({
            totalReady: leads.length,
            readyWithSends: withSends,
            examples: examples.slice(0, 10) // Show first 10 examples
        });

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

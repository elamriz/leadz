import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST create a manual lead
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { displayName, email, phone, city, niche, formattedAddress } = body;

        if (!displayName) {
            return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
        }

        const lead = await prisma.lead.create({
            data: {
                placeId: `manual_${Date.now()}`,
                displayName,
                formattedAddress: formattedAddress || city || null,
                city: city || null,
                nationalPhone: phone || null,
                niche: niche || null,
                status: 'NEW',
                score: 50,
                emails: email ? {
                    create: {
                        email,
                        source: 'manual',
                        confidence: 'HIGH',
                        isGeneric: false,
                    },
                } : undefined,
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

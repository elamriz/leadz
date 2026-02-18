
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: List all groups
export async function GET() {
    try {
        const groups = await prisma.leadGroup.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { leads: true } },
            },
        });
        return NextResponse.json({ groups });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Create a new group
export async function POST(req: NextRequest) {
    try {
        const { name, color } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const group = await prisma.leadGroup.create({
            data: {
                name,
                color: color || '#6366f1',
            },
        });

        return NextResponse.json({ group });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

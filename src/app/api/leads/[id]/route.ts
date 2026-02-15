import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/dedup';

// GET single lead with full details
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const lead = await prisma.lead.findUnique({
            where: { id },
            include: {
                emails: true,
                scoringSignals: true,
                campaignSends: {
                    include: { campaign: { select: { id: true, name: true, subject: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                auditLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
                searchRunLeads: {
                    include: { searchRun: { select: { id: true, query: true, location: true, createdAt: true } } },
                },
            },
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        return NextResponse.json({ lead });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH update lead
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, notes, tags, niche } = body;

        const existing = await prisma.lead.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (status !== undefined) {
            updateData.status = status;
            await logAudit('status_change', id, `Status changed`, existing.status, status);
        }
        if (notes !== undefined) updateData.notes = notes;
        if (tags !== undefined) updateData.tags = tags;
        if (niche !== undefined) updateData.niche = niche;

        const lead = await prisma.lead.update({
            where: { id },
            data: updateData,
            include: { emails: true },
        });

        return NextResponse.json({ lead });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE lead
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.lead.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

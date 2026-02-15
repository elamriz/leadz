import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/dedup';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, leadIds, data } = body;

        if (!action || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json(
                { error: 'action and leadIds[] are required' },
                { status: 400 }
            );
        }

        let affected = 0;

        switch (action) {
            case 'change_status': {
                if (!data?.status) {
                    return NextResponse.json({ error: 'data.status is required' }, { status: 400 });
                }
                const result = await prisma.lead.updateMany({
                    where: { id: { in: leadIds } },
                    data: { status: data.status },
                });
                affected = result.count;
                for (const leadId of leadIds) {
                    await logAudit('bulk_status_change', leadId, `Bulk status change to ${data.status}`);
                }
                break;
            }

            case 'add_tags': {
                if (!data?.tags || !Array.isArray(data.tags)) {
                    return NextResponse.json({ error: 'data.tags[] is required' }, { status: 400 });
                }
                const leads = await prisma.lead.findMany({
                    where: { id: { in: leadIds } },
                    select: { id: true, tags: true },
                });
                for (const lead of leads) {
                    const newTags = [...new Set([...lead.tags, ...data.tags])];
                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: { tags: newTags },
                    });
                    affected++;
                }
                break;
            }

            case 'remove_tags': {
                if (!data?.tags || !Array.isArray(data.tags)) {
                    return NextResponse.json({ error: 'data.tags[] is required' }, { status: 400 });
                }
                const leadsToUpdate = await prisma.lead.findMany({
                    where: { id: { in: leadIds } },
                    select: { id: true, tags: true },
                });
                for (const lead of leadsToUpdate) {
                    const newTags = lead.tags.filter((t: string) => !data.tags.includes(t));
                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: { tags: newTags },
                    });
                    affected++;
                }
                break;
            }

            case 'delete': {
                const result = await prisma.lead.deleteMany({
                    where: { id: { in: leadIds } },
                });
                affected = result.count;
                break;
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        return NextResponse.json({ success: true, affected });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

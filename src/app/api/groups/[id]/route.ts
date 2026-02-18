
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE: Remove a group
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Check if group exists
        const exists = await prisma.leadGroup.findUnique({ where: { id } });
        if (!exists) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Delete group (cascade rules in prisma usually minimal, but explicitly remove relation first if needed)
        // Since it's Many-to-Many via implicit table, deleting group removes relation automatically in Prisma.
        await prisma.leadGroup.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

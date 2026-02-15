import { NextResponse } from 'next/server';
import { getUsageSummary } from '@/lib/usage-tracker';

export async function GET() {
    try {
        const summary = await getUsageSummary();
        return NextResponse.json(summary);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all templates
export async function GET() {
    try {
        const templates = await prisma.emailTemplate.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ templates });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST create template
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, subject, body: templateBody, niche, variables, type = 'email', language = 'fr' } = body;

        if (!name || !subject || !templateBody) {
            return NextResponse.json(
                { error: 'name, subject, and body are required' },
                { status: 400 }
            );
        }

        // Auto-detect variables from template
        const detectedVars: string[] = [];
        const regex = /\{(\w+)\}/g;
        let match;
        const combined = subject + ' ' + templateBody;
        while ((match = regex.exec(combined)) !== null) {
            if (!detectedVars.includes(match[1])) {
                detectedVars.push(match[1]);
            }
        }

        const template = await prisma.emailTemplate.create({
            data: {
                name,
                subject,
                body: templateBody,
                type,
                language,
                niche,
                variables: variables || detectedVars,
            },
        });

        return NextResponse.json({ template }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT update template
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, name, subject, body: templateBody, niche, type, language } = body;

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        // Auto-detect variables
        const detectedVars: string[] = [];
        const regex = /\{(\w+)\}/g;
        let match;
        const combined = (subject || '') + ' ' + (templateBody || '');
        while ((match = regex.exec(combined)) !== null) {
            if (!detectedVars.includes(match[1])) {
                detectedVars.push(match[1]);
            }
        }

        const template = await prisma.emailTemplate.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(subject !== undefined && { subject }),
                ...(templateBody !== undefined && { body: templateBody }),
                ...(niche !== undefined && { niche }),
                ...(type !== undefined && { type }),
                ...(language !== undefined && { language }),
                variables: detectedVars,
            },
        });

        return NextResponse.json({ template });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE template
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        await prisma.emailTemplate.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

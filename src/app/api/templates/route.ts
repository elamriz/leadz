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
        const { name, subject, body: templateBody, niche, variables, type = 'email' } = body;

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

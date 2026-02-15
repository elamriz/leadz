import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, renderTemplate, getSmtpConfig } from '@/lib/mailer';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'email is required' }, { status: 400 });
        }

        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: { template: true },
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        if (!campaign.template) {
            return NextResponse.json({ error: 'Campaign has no template' }, { status: 400 });
        }

        // Use dummy variables for test
        const testVars = {
            company_name: 'Test Company',
            city: 'Brussels',
            website: 'www.example.com',
            niche: 'electricians',
            phone: '+32 2 123 4567',
            rating: '4.5',
            review_count: '127',
            first_name: 'John',
        };

        const subject = renderTemplate(campaign.subject, testVars);
        const html = renderTemplate(campaign.template.body, testVars);

        const smtp = await getSmtpConfig();
        const result = await sendEmail({ to: email, subject, html }, smtp);

        return NextResponse.json({
            success: result.success,
            messageId: result.messageId,
            error: result.error,
            subject,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

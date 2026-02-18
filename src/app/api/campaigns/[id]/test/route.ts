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

        // Resolve which template to use for the test
        let testTemplate = campaign.template;

        // If no single template but templateIds rotation is set, pick a random one
        if (!testTemplate && campaign.templateIds && campaign.templateIds.length > 0) {
            const randomId = campaign.templateIds[Math.floor(Math.random() * campaign.templateIds.length)];
            testTemplate = await prisma.emailTemplate.findUnique({ where: { id: randomId } }) as any;
        }

        // If smartSending, pick the first active template matching language
        if (!testTemplate && campaign.smartSending) {
            testTemplate = await prisma.emailTemplate.findFirst({
                where: { isActive: true, language: campaign.language, type: campaign.channel },
            }) as any;
        }

        if (!testTemplate) {
            return NextResponse.json({ error: 'No template found for this campaign' }, { status: 400 });
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

        // Always use the template's own subject (never campaign.subject)
        const subject = renderTemplate((testTemplate as any).subject, testVars);
        const html = renderTemplate((testTemplate as any).body, testVars);

        const smtp = await getSmtpConfig();

        let senderName = campaign.senderName || smtp.senderName;
        if (campaign.senderNames && campaign.senderNames.length > 0) {
            senderName = campaign.senderNames[Math.floor(Math.random() * campaign.senderNames.length)];
        }

        const result = await sendEmail({ to: email, subject, html }, { ...smtp, senderName });

        return NextResponse.json({
            success: result.success,
            messageId: result.messageId,
            error: result.error,
            subject,
            templateUsed: (testTemplate as any).name,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, renderTemplate, getSmtpConfig } from '@/lib/mailer';
import { pickSmartTemplate } from '@/lib/campaign-utils';

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

        // If smartSending, pick the most appropriate template based on test data
        if (!testTemplate && campaign.smartSending) {
            const allTemplates = await prisma.emailTemplate.findMany({
                where: { isActive: true, language: campaign.language, type: campaign.channel },
            });

            // Mock lead for smart selection
            const mockLead = {
                displayName: 'Test Company',
                city: 'Brussels',
                websiteUri: 'www.example.com',
                niche: 'electricians',
                rating: 4.5,
                userRatingCount: 127,
                scoringSignals: {
                    isAccessible: true,
                    designScore: 75,
                    performanceScore: 80,
                }
            };

            testTemplate = pickSmartTemplate(mockLead, allTemplates) as any;
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
        const body = renderTemplate((testTemplate as any).body, testVars);

        const smtp = await getSmtpConfig();

        let senderName = campaign.senderName || smtp.senderName;
        if (campaign.senderNames && campaign.senderNames.length > 0) {
            senderName = campaign.senderNames[Math.floor(Math.random() * campaign.senderNames.length)];
        }

        // Send as plain text to match production behavior
        const result = await sendEmail({ to: email, subject, html: '', text: body }, { ...smtp, senderName });

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

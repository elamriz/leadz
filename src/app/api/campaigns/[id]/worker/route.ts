import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, renderTemplate, addUnsubscribeLinkText, getSmtpConfig, formatCity } from '@/lib/mailer';
import { logAudit } from '@/lib/dedup';
import { pickSmartTemplate, pickByTag } from '@/lib/campaign-utils';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: { template: true },
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // If not running, don't do anything (unless we want to restart it?)
        // The client loop should stop calling this if status is done/idle.
        if (campaign.jobStatus !== 'running') {
            return NextResponse.json({
                jobStatus: campaign.jobStatus,
                processed: 0,
                message: 'Job is not running'
            });
        }

        // Fetch ONE queued item
        const nextSend = await prisma.campaignSend.findFirst({
            where: {
                campaignId: id,
                status: 'QUEUED',
            },
            include: { lead: { include: { emails: true, scoringSignals: true } } }, // signals needed for smart templates
            orderBy: { createdAt: 'asc' }, // FIFO
        });

        if (!nextSend) {
            // No more work -> Mark job as done
            await prisma.campaign.update({
                where: { id },
                data: { jobStatus: 'done' },
            });
            return NextResponse.json({
                jobStatus: 'done',
                processed: 0,
                message: 'Job finished'
            });
        }

        const lead = nextSend.lead;
        const emailAddress = nextSend.email;

        // 1. Template Selection (if smartSending was used, we need to pick it now or use what was saved?)
        // The previous code selected templates at enqueue time? 
        // No, in my refactor of /send, I removed the template picking from the loop!
        // Wait, I see `templateUsed: selectedTemplate.name` in the original /send code, but 
        // in my refactor I created the CampaignSend record with status=QUEUED but WITHOUT templateUsed?
        // Let me check my previous edit.
        // ... I see in the refactor I removed template selection and rendering and just queued the lead.
        // So I must do template selection HERE in the worker.

        // Re-fetch templates logic (copied/adapted from original route)
        let selectedTemplate: any = null;

        // Strategy 1: Smart Sending
        if (campaign.smartSending) {
            // Need all active templates for this channel/lang
            const eligibleTemplates = await prisma.emailTemplate.findMany({
                where: {
                    isActive: true,
                    language: campaign.language,
                    type: campaign.channel,
                }
            });

            // Helper from previous file (need to duplicate or share logic)
            selectedTemplate = pickSmartTemplate(lead, eligibleTemplates);
        }
        // Strategy 2: User Selected Template(s)
        else {
            let eligibleTemplates: any[] = [];
            if (campaign.templateIds && campaign.templateIds.length > 0) {
                eligibleTemplates = await prisma.emailTemplate.findMany({
                    where: { id: { in: campaign.templateIds }, isActive: true },
                });
            } else if (campaign.templateId) {
                const t = await prisma.emailTemplate.findUnique({ where: { id: campaign.templateId } });
                if (t && t.isActive) eligibleTemplates = [t];
            }

            if (eligibleTemplates.length > 0) {
                selectedTemplate = eligibleTemplates[Math.floor(Math.random() * eligibleTemplates.length)];
            }
        }

        if (!selectedTemplate) {
            // Should not happen if campaign config is valid, but handle error
            await prisma.campaignSend.update({
                where: { id: nextSend.id },
                data: { status: 'FAILED', errorMessage: 'No valid template found during processing' }
            });
            return NextResponse.json({ jobStatus: 'running', processed: 1, result: 'failed_no_template' });
        }

        // 2. Render content
        const variables = {
            company_name: lead.displayName,
            city: formatCity(lead.city || lead.formattedAddress?.split(',').pop()?.trim()),
            website: lead.websiteUri || '',
            niche: lead.niche || '',
            phone: lead.nationalPhone || '',
            rating: lead.rating?.toString() || '',
            review_count: lead.userRatingCount?.toString() || '',
        };

        const subject = renderTemplate(selectedTemplate.subject, variables);
        let body = renderTemplate(selectedTemplate.body, variables);
        body = addUnsubscribeLinkText(body, `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(emailAddress)}`);

        // 3. Sender Name
        const smtpConfig = await getSmtpConfig();
        let senderName = campaign.senderName || smtpConfig.senderName;
        if (campaign.senderNames && campaign.senderNames.length > 0) {
            senderName = campaign.senderNames[Math.floor(Math.random() * campaign.senderNames.length)];
        }

        // 4. Send via Brevo with Campaign ID tag for stats (plain text to avoid spam)
        const result = await sendEmail({
            to: emailAddress,
            subject,
            html: '',
            text: body,
            tags: [id],
        }, { ...smtpConfig, senderName });

        if (result.success) {
            await prisma.campaignSend.update({
                where: { id: nextSend.id },
                data: {
                    status: 'SENT',
                    sentAt: new Date(),
                    templateUsed: selectedTemplate.name,
                    brevoMessageId: result.messageId // Save messageId for stats
                },
            });

            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    status: 'SENT',
                    lastContactedAt: new Date(),
                },
            });

            await prisma.campaign.update({
                where: { id },
                data: { totalSent: { increment: 1 } },
            });

            await logAudit('email_sent', lead.id, `Campaign: ${campaign.name} (Background)`);
            return NextResponse.json({ jobStatus: 'running', processed: 1, result: 'sent' });

        } else {
            await prisma.campaignSend.update({
                where: { id: nextSend.id },
                data: {
                    status: 'FAILED',
                    errorMessage: result.error,
                    templateUsed: selectedTemplate.name
                },
            });

            await prisma.campaign.update({
                where: { id },
                data: { totalFailed: { increment: 1 } },
            });
            return NextResponse.json({ jobStatus: 'running', processed: 1, result: 'failed', error: result.error });
        }

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}


// ─── Helpers moved to src/lib/campaign-utils.ts ───────────────────────

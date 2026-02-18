import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, renderTemplate, addUnsubscribeLink, randomDelay, getSmtpConfig } from '@/lib/mailer';
import { canContactLead, hasReceivedCampaign, logAudit } from '@/lib/dedup';

export async function POST(
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

        // ── WhatsApp Campaign Flow ──────────────────────────────────
        if (campaign.channel === 'whatsapp') {
            const leadFilter: Record<string, unknown> = {
                status: { in: ['NEW', 'READY'] },
                nationalPhone: { not: null },
            };

            // If campaign has specific leads selected, only send to those leads
            // (bypass status/safeSend filters — user explicitly chose these leads)
            if (campaign.selectedLeadIds && campaign.selectedLeadIds.length > 0) {
                leadFilter.id = { in: campaign.selectedLeadIds };
                delete leadFilter.status; // Don't filter by status for targeted campaigns
            } else {
                // Otherwise use niche and other filters
                if (campaign.niche) {
                    leadFilter.niche = { contains: campaign.niche, mode: 'insensitive' };
                }
                if (campaign.noWebsiteOnly) {
                    leadFilter.websiteUri = null;
                }
                if (campaign.safeSendMode) {
                    leadFilter.lastContactedAt = null;
                }
            }

            const leads = await prisma.lead.findMany({
                where: leadFilter,
                include: { emails: true },
                orderBy: { score: 'desc' },
                take: campaign.dailyLimit,
            });

            // Generate wa.me links
            const waLinks: {
                leadId: string;
                name: string;
                phone: string;
                url: string;
                message: string;
            }[] = [];

            for (const lead of leads) {
                const contactCheck = await canContactLead(lead.id, campaign.cooldownDays);
                if (!contactCheck.canContact) continue;

                const alreadySent = await hasReceivedCampaign(lead.id, id);
                if (alreadySent) continue;

                const variables = {
                    company_name: lead.displayName,
                    city: lead.city || lead.formattedAddress?.split(',').pop()?.trim() || '',
                    website: lead.websiteUri || '',
                    niche: lead.niche || '',
                    phone: lead.nationalPhone || '',
                    rating: lead.rating?.toString() || '',
                    review_count: lead.userRatingCount?.toString() || '',
                };

                const message = renderTemplate(campaign.template?.body || '', variables);
                const cleanPhone = (lead.nationalPhone || '').replace(/[\s\-\(\)\.+]/g, '');
                const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

                waLinks.push({
                    leadId: lead.id,
                    name: lead.displayName,
                    phone: lead.nationalPhone || '',
                    url: waUrl,
                    message,
                });
            }

            // Update campaign status
            await prisma.campaign.update({
                where: { id },
                data: { status: 'ACTIVE' },
            });

            return NextResponse.json({
                campaign: { id, name: campaign.name },
                channel: 'whatsapp',
                waLinks,
                totalEligible: waLinks.length,
            });
        }

        // ── Email Campaign Flow (existing) ──────────────────────────
        const leadFilter: Record<string, unknown> = {
            status: { in: ['NEW', 'READY'] },
            emails: { some: {} },
        };

        // If campaign has specific leads selected, only send to those leads
        // (bypass status/safeSend filters — user explicitly chose these leads)
        if (campaign.selectedLeadIds && campaign.selectedLeadIds.length > 0) {
            leadFilter.id = { in: campaign.selectedLeadIds };
            delete leadFilter.status; // Don't filter by status for targeted campaigns
        } else {
            // Otherwise use niche and other filters
            if (campaign.niche) {
                leadFilter.niche = { contains: campaign.niche, mode: 'insensitive' };
            }
            if (campaign.noWebsiteOnly) {
                leadFilter.websiteUri = null;
            }
            if (campaign.safeSendMode) {
                leadFilter.lastContactedAt = null;
            }
        }

        // ─── 4. Fetch Templates ─────────────────────────────────────────────

        // Fetch eligible templates based on strategy
        let eligibleTemplates: any[] = [];

        if (campaign.smartSending) {
            eligibleTemplates = await prisma.emailTemplate.findMany({
                where: {
                    isActive: true, // Only active templates
                    language: campaign.language,
                    type: campaign.channel,
                }
            });
        } else if (campaign.templateIds && campaign.templateIds.length > 0) {
            eligibleTemplates = await prisma.emailTemplate.findMany({
                where: { id: { in: campaign.templateIds }, isActive: true },
            });
        } else if (campaign.templateId) {
            const t = await prisma.emailTemplate.findUnique({ where: { id: campaign.templateId } });
            if (t && t.isActive) eligibleTemplates = [t];
        }

        if (eligibleTemplates.length === 0) {
            return NextResponse.json({ error: 'No valid templates found for this campaign' }, { status: 400 });
        }

        // Helper to pick template based on lead tags/score
        const pickSmartTemplate = (lead: any, templates: any[]) => {
            if (!campaign.smartSending) return null;

            const signal = lead.scoringSignals; // Single object, not array

            // 1. Inaccessible
            if (signal && signal.isAccessible === false) {
                const t = templates.find((t: any) => t.tags.includes('inaccessible'));
                if (t) return t;
            }

            // 2. No Website (if URI is empty or "http" only or minimal length)
            if (!lead.websiteUri || lead.websiteUri.length < 5) {
                const t = templates.find((t: any) => t.tags.includes('no-website'));
                if (t) return t;
            }

            // 3. High Reputation but Bad Site
            // Rating > 4.5 AND (Performance < 50 OR Design < 50)
            if (lead.rating && lead.rating >= 4.5) {
                if (signal && (signal.performanceScore < 50 || signal.designScore < 50)) {
                    const t = templates.find((t: any) => t.tags.includes('reputation'));
                    if (t) return t;
                }
            }

            // 4. Outdated / improvable website
            // Has a website but design score < 50 OR performance score < 40
            if (lead.websiteUri && lead.websiteUri.length >= 5) {
                if (signal && (signal.designScore < 50 || signal.performanceScore < 40)) {
                    const t = templates.find((t: any) => t.tags.includes('outdated-website'));
                    if (t) return t;
                }
            }

            // 5. Fallback: "general" tag
            const general = templates.find((t: any) => t.tags.includes('general'));
            if (general) return general;

            // Random as last resort
            return templates[Math.floor(Math.random() * templates.length)];
        };


        const leads = await prisma.lead.findMany({
            where: leadFilter,
            include: {
                emails: true,
                scoringSignals: true // Fetch signals for smart logic
            },
            orderBy: { score: 'desc' },
            take: campaign.dailyLimit,
        });

        // Check today's send count
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todaySends = await prisma.campaignSend.count({
            where: {
                campaignId: id,
                createdAt: { gte: todayStart },
                status: { not: 'QUEUED' },
            },
        });

        const remainingToday = Math.max(0, campaign.dailyLimit - todaySends);
        if (remainingToday === 0) {
            return NextResponse.json(
                { error: 'Daily send limit reached', todaySends },
                { status: 429 }
            );
        }

        // Update campaign status
        await prisma.campaign.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });

        const results = {
            sent: 0,
            skipped: 0,
            failed: 0,
            reasons: [] as string[],
        };

        let sendCount = 0;

        for (const lead of leads) {
            if (sendCount >= remainingToday) break;

            // Check if can contact (skip cooldown for targeted campaigns — user explicitly chose these leads)
            if (!campaign.selectedLeadIds || campaign.selectedLeadIds.length === 0) {
                const contactCheck = await canContactLead(lead.id, campaign.cooldownDays);
                if (!contactCheck.canContact) {
                    results.skipped++;
                    results.reasons.push(`${lead.displayName}: ${contactCheck.reason}`);
                    continue;
                }
            }

            // Check campaign dedup
            const alreadySent = await hasReceivedCampaign(lead.id, id);
            if (alreadySent) {
                results.skipped++;
                results.reasons.push(`${lead.displayName}: Already received this campaign`);
                continue;
            }

            // Get best email
            const leadAny = lead as any;
            const email = leadAny.emails.find((e: { isGeneric: boolean; email: string }) => !e.isGeneric) || leadAny.emails[0];
            if (!email) {
                results.skipped++;
                continue;
            }

            // Select Template (Smart or Random)
            let selectedTemplate = null;
            if (campaign.smartSending) {
                selectedTemplate = pickSmartTemplate(lead, eligibleTemplates);
            } else {
                selectedTemplate = eligibleTemplates[Math.floor(Math.random() * eligibleTemplates.length)];
            }

            if (!selectedTemplate) {
                results.skipped++;
                continue;
            }

            // Render template
            const variables = {
                company_name: lead.displayName,
                city: lead.city || lead.formattedAddress?.split(',').pop()?.trim() || '',
                website: lead.websiteUri || '',
                niche: lead.niche || '',
                phone: lead.nationalPhone || '',
                rating: lead.rating?.toString() || '',
                review_count: lead.userRatingCount?.toString() || '',
            };

            const subject = renderTemplate(selectedTemplate.subject, variables);
            let html = renderTemplate(selectedTemplate.body, variables);
            html = addUnsubscribeLink(html, `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(email.email)}`);

            // Creates send record
            const send = await prisma.campaignSend.create({
                data: {
                    campaignId: id,
                    leadId: lead.id,
                    email: email.email,
                    templateUsed: selectedTemplate.name,
                    status: 'QUEUED',
                },
            });

            // Get SMTP config and rotate sender name
            const smtpConfig = await getSmtpConfig();
            let senderName = campaign.senderName || smtpConfig.senderName;

            if (campaign.senderNames && campaign.senderNames.length > 0) {
                // Pick random sender name
                senderName = campaign.senderNames[Math.floor(Math.random() * campaign.senderNames.length)];
            }

            // Send email with Rotating Sender Name
            const result = await sendEmail({
                to: email.email,
                subject,
                html,
            }, { ...smtpConfig, senderName });

            if (result.success) {
                await prisma.campaignSend.update({
                    where: { id: send.id },
                    data: { status: 'SENT', sentAt: new Date() },
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

                await logAudit('email_sent', lead.id, `Campaign: ${campaign.name}`);
                results.sent++;
                sendCount++;
            } else {
                await prisma.campaignSend.update({
                    where: { id: send.id },
                    data: {
                        status: 'FAILED',
                        errorMessage: result.error,
                    },
                });

                await prisma.campaign.update({
                    where: { id },
                    data: { totalFailed: { increment: 1 } },
                });

                results.failed++;
                results.reasons.push(`${lead.displayName}: ${result.error}`);
            }

            // Random delay between sends
            if (sendCount < remainingToday) {
                await randomDelay(campaign.minDelaySeconds, campaign.maxDelaySeconds);
            }
        }

        // Update campaign if all leads processed
        if (results.sent === 0 && results.skipped === leads.length) {
            await prisma.campaign.update({
                where: { id },
                data: { status: 'COMPLETED' },
            });
        }

        return NextResponse.json({
            campaign: { id, name: campaign.name },
            channel: 'email',
            results,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

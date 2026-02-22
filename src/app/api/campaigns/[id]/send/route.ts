import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, renderTemplate, addUnsubscribeLink, randomDelay, getSmtpConfig, formatCity } from '@/lib/mailer';
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
                // Filter by group if set (group overrides individual niche filtering)
                if (campaign.groupId) {
                    leadFilter.groups = { some: { id: campaign.groupId } };
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
                    city: formatCity(lead.city || lead.formattedAddress?.split(',').pop()?.trim()),
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

        // ─── Email Campaign Flow (Background Queue) ──────────────────────────
        const leadFilter: Record<string, unknown> = {
            status: { in: ['NEW', 'READY'] },
            emails: { some: {} },
        };

        // If campaign has specific leads selected, only send to those leads
        if (campaign.selectedLeadIds && campaign.selectedLeadIds.length > 0) {
            leadFilter.id = { in: campaign.selectedLeadIds };
            delete leadFilter.status;
        } else {
            // Filter by group if set
            if (campaign.groupId) {
                leadFilter.groups = { some: { id: campaign.groupId } };
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

        // Check if already running or completed today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Count existing sends for today to respect daily limit
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
                { error: 'Daily send limit reached for today', todaySends },
                { status: 429 }
            );
        }

        // Limit leads to remaining quota
        const leadsToQueue = leads.slice(0, remainingToday);

        if (leadsToQueue.length === 0) {
            return NextResponse.json({ error: 'No eligible leads found to queue' }, { status: 400 });
        }

        // ─── Enqueue Leads ──────────────────────────────────────────────────

        let queuedCount = 0;
        const queuedLeads = [];

        for (const lead of leadsToQueue) {
            // Check constraints again (double check)
            if (!campaign.selectedLeadIds || campaign.selectedLeadIds.length === 0) {
                const contactCheck = await canContactLead(lead.id, campaign.cooldownDays);
                if (!contactCheck.canContact) continue;
            }

            const alreadySent = await hasReceivedCampaign(lead.id, id);
            if (alreadySent) continue;

            const leadAny = lead as any;
            const email = leadAny.emails.find((e: { isGeneric: boolean; email: string }) => !e.isGeneric) || leadAny.emails[0];
            if (!email) continue;

            // Create QUEUED send record
            await prisma.campaignSend.create({
                data: {
                    campaignId: id,
                    leadId: lead.id,
                    email: email.email,
                    status: 'QUEUED',
                },
            });
            queuedCount++;
            queuedLeads.push(lead.id);
        }

        if (queuedCount === 0) {
            return NextResponse.json({ error: 'All eligible leads were skipped (already contacted or invalid)' }, { status: 400 });
        }

        // Update campaign status to running
        await prisma.campaign.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                jobStatus: 'running',
                jobTotal: queuedCount
            },
        });

        return NextResponse.json({
            campaign: { id, name: campaign.name },
            channel: 'email',
            queued: queuedCount,
            jobStatus: 'running',
            message: `Enqueued ${queuedCount} leads for background sending`
        });

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

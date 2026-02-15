import prisma from './prisma';
import type { Lead } from '../generated/prisma';
import { extractDomain } from './google-maps';

// ─── Types ──────────────────────────────────────────────────────
export interface DeduplicationResult {
    isDuplicate: boolean;
    existingLead?: Lead;
    matchedBy?: 'placeId' | 'domain' | 'phone';
}

// ─── Deduplicate Lead ───────────────────────────────────────────
export async function deduplicateLead(
    placeId?: string | null,
    websiteUri?: string | null,
    phone?: string | null
): Promise<DeduplicationResult> {
    // 1. Check by placeId (primary)
    if (placeId) {
        const existing = await prisma.lead.findUnique({ where: { placeId } });
        if (existing) {
            return { isDuplicate: true, existingLead: existing, matchedBy: 'placeId' };
        }
    }

    // 2. Check by website domain (secondary)
    if (websiteUri) {
        const domain = extractDomain(websiteUri);
        if (domain) {
            const existing = await prisma.lead.findFirst({
                where: { websiteDomain: domain },
            });
            if (existing) {
                return { isDuplicate: true, existingLead: existing, matchedBy: 'domain' };
            }
        }
    }

    // 3. Check by phone (secondary)
    if (phone) {
        const normalized = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
        if (normalized.length >= 8) {
            const existing = await prisma.lead.findFirst({
                where: { nationalPhone: { contains: normalized.slice(-8) } },
            });
            if (existing) {
                return { isDuplicate: true, existingLead: existing, matchedBy: 'phone' };
            }
        }
    }

    return { isDuplicate: false };
}

// ─── Check if lead can be contacted ─────────────────────────────
export async function canContactLead(leadId: string, cooldownDays = 30): Promise<{
    canContact: boolean;
    reason?: string;
}> {
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { emails: true },
    });

    if (!lead) return { canContact: false, reason: 'Lead not found' };

    // Check suppression status
    if (lead.status === 'DO_NOT_CONTACT') {
        return { canContact: false, reason: 'Lead is on Do Not Contact list' };
    }

    if (lead.status === 'BOUNCED') {
        return { canContact: false, reason: 'Previous emails bounced' };
    }

    if (lead.status === 'REPLIED') {
        return { canContact: false, reason: 'Lead already replied — handle manually' };
    }

    // Check cooldown period
    if (lead.lastContactedAt) {
        const daysSinceContact = Math.floor(
            (Date.now() - lead.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceContact < cooldownDays) {
            return {
                canContact: false,
                reason: `Contacted ${daysSinceContact} days ago (cooldown: ${cooldownDays} days)`,
            };
        }
    }

    // Check if lead has email
    if (lead.emails.length === 0) {
        return { canContact: false, reason: 'No email address available' };
    }

    // Check suppression list for email
    for (const email of lead.emails) {
        const suppressed = await prisma.suppressionEntry.findFirst({
            where: {
                OR: [
                    { email: email.email },
                    { domain: email.email.split('@')[1] },
                ],
            },
        });
        if (suppressed) {
            return { canContact: false, reason: `Email ${email.email} is on suppression list` };
        }
    }

    return { canContact: true };
}

// ─── Check campaign dedup ───────────────────────────────────────
export async function hasReceivedCampaign(
    leadId: string,
    campaignId: string
): Promise<boolean> {
    const send = await prisma.campaignSend.findFirst({
        where: {
            leadId,
            campaignId,
            status: { in: ['SENT', 'OPENED', 'CLICKED', 'REPLIED'] },
        },
    });
    return !!send;
}

// ─── Log audit event ────────────────────────────────────────────
export async function logAudit(
    action: string,
    leadId?: string,
    details?: string,
    oldValue?: string,
    newValue?: string
) {
    await prisma.auditLog.create({
        data: { action, leadId, details, oldValue, newValue },
    });
}

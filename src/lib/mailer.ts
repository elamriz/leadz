import prisma from '@/lib/prisma';

// ─── Types ──────────────────────────────────────────────────────
export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
    tags?: string[];
}

export interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface SmtpConfig {
    apiKey: string;
    senderEmail: string;
    senderName: string;
    replyToEmail?: string;
}

// ─── Template Variables ─────────────────────────────────────────
export interface TemplateVariables {
    company_name?: string;
    city?: string;
    website?: string;
    niche?: string;
    first_name?: string;
    phone?: string;
    rating?: string;
    review_count?: string;
    [key: string]: string | undefined;
}

// ─── Get Brevo Config (DB settings take priority over env) ──────
export async function getSmtpConfig(): Promise<SmtpConfig> {
    try {
        const dbSettings = await prisma.setting.findMany({
            where: { key: { in: ['brevo_api_key', 'sender_email', 'sender_name', 'reply_to_email', 'smtp_user', 'smtp_pass', 'smtp_from'] } },
        });
        const map: Record<string, string> = {};
        dbSettings.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });

        return {
            apiKey: map['brevo_api_key'] || process.env.BREVO_API_KEY || '',
            senderEmail: map['sender_email'] || map['smtp_from'] || process.env.SENDER_EMAIL || process.env.SMTP_FROM || '',
            senderName: map['sender_name'] || process.env.SENDER_NAME || 'LeadForge',
            replyToEmail: map['reply_to_email'] || process.env.REPLY_TO_EMAIL,
        };
    } catch {
        // Fallback to env if DB is not available
        return {
            apiKey: process.env.BREVO_API_KEY || '',
            senderEmail: process.env.SENDER_EMAIL || process.env.SMTP_FROM || '',
            senderName: process.env.SENDER_NAME || 'LeadForge',
            replyToEmail: process.env.REPLY_TO_EMAIL,
        };
    }
}

// ─── Send Email via Brevo HTTP API ──────────────────────────────
export async function sendEmail(options: EmailOptions, config?: SmtpConfig): Promise<SendResult> {
    try {
        const cfg = config || await getSmtpConfig();

        if (!cfg.apiKey) {
            return { success: false, error: 'Brevo API key is missing. Set BREVO_API_KEY in .env or configure in Settings.' };
        }

        const senderEmail = options.from || cfg.senderEmail;
        if (!senderEmail) {
            return { success: false, error: 'Sender email not configured. Set SENDER_EMAIL in .env or configure in Settings.' };
        }

        const replyTo = options.replyTo || cfg.replyToEmail;
        // If plain text is provided, send ONLY textContent (no htmlContent)
        // This makes the email look like a personal message, not a newsletter
        const contentFields = options.text
            ? { textContent: options.text }
            : { htmlContent: options.html };

        const payload = {
            sender: { email: senderEmail, name: cfg.senderName },
            to: [{ email: options.to }],
            subject: options.subject,
            ...contentFields,
            ...(options.tags && { tags: options.tags }),
            ...(replyTo && { replyTo: { email: replyTo } }),
        };

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': cfg.apiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Brevo API error:', response.status, errorBody);
            return { success: false, error: `Brevo API error (${response.status}): ${errorBody}` };
        }

        const result = await response.json();
        return {
            success: true,
            messageId: result.messageId,
        };
    } catch (error) {
        console.error('Email send error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ─── Format City (remove zip code) ──────────────────────────────
export function formatCity(city: string | null | undefined): string {
    if (!city) return '';
    // Removes leading digits and spaces (e.g. "1000 Bruxelles" -> "Bruxelles")
    const cleaned = city.replace(/^[\d-]+\s*/, '').trim();
    // Capitalize first letter just in case
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// ─── Render Template ────────────────────────────────────────────
export function renderTemplate(template: string, variables: TemplateVariables): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        rendered = rendered.replace(regex, value || '');
    }
    return rendered;
}

// ─── Add Unsubscribe Link ───────────────────────────────────────
export function addUnsubscribeLink(html: string, unsubscribeUrl: string): string {
    const footer = `
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #333; font-size: 12px; color: #666; text-align: center;">
      <p>If you no longer wish to receive these emails, <a href="${unsubscribeUrl}" style="color: #888;">click here to unsubscribe</a>.</p>
    </div>
  `;
    return html + footer;
}

// ─── Add Unsubscribe Link (Plain Text) ──────────────────────
export function addUnsubscribeLinkText(text: string, unsubscribeUrl: string): string {
    const footer = `\n\n---\nSi vous ne souhaitez plus recevoir ces emails : ${unsubscribeUrl}`;
    return text + footer;
}

// ─── Verify Brevo Connection ────────────────────────────────────
export async function verifySmtp(config?: SmtpConfig): Promise<{ success: boolean; error?: string }> {
    try {
        const cfg = config || await getSmtpConfig();

        if (!cfg.apiKey) {
            return { success: false, error: 'Brevo API key not configured' };
        }

        // Test API key by fetching account info
        const response = await fetch('https://api.brevo.com/v3/account', {
            headers: { 'api-key': cfg.apiKey },
        });

        if (!response.ok) {
            return { success: false, error: `Brevo API returned ${response.status}` };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ─── Random Delay ───────────────────────────────────────────────
export function randomDelay(minSeconds: number, maxSeconds: number): Promise<void> {
    const ms = (Math.random() * (maxSeconds - minSeconds) + minSeconds) * 1000;
    return new Promise(resolve => setTimeout(resolve, ms));
}

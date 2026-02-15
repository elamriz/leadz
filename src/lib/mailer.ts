import nodemailer from 'nodemailer';

// ─── Types ──────────────────────────────────────────────────────
export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
}

export interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
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

// ─── Get SMTP Config ────────────────────────────────────────────
function getSmtpConfig(): SmtpConfig {
    return {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    };
}

// ─── Create Transporter ─────────────────────────────────────────
function createTransporter(config?: SmtpConfig) {
    const smtp = config || getSmtpConfig();
    return nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
    });
}

// ─── Send Email ─────────────────────────────────────────────────
export async function sendEmail(options: EmailOptions, config?: SmtpConfig): Promise<SendResult> {
    try {
        const smtp = config || getSmtpConfig();
        const transporter = createTransporter(config);

        const result = await transporter.sendMail({
            from: options.from || smtp.from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
            replyTo: options.replyTo,
        });

        return {
            success: true,
            messageId: result.messageId,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
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

// ─── Verify SMTP Connection ─────────────────────────────────────
export async function verifySmtp(config?: SmtpConfig): Promise<{ success: boolean; error?: string }> {
    try {
        const transporter = createTransporter(config);
        await transporter.verify();
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

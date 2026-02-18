import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getOrCreateCaps } from '@/lib/usage-tracker';
import { verifySmtp } from '@/lib/mailer';

// GET settings
export async function GET() {
    try {
        const [settings, scoringConfig, caps] = await Promise.all([
            prisma.setting.findMany(),
            prisma.scoringConfig.findFirst({ where: { isActive: true } }),
            getOrCreateCaps(),
        ]);

        const settingsMap: Record<string, string> = {};
        settings.forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });

        const brevoApiKey = settingsMap['brevo_api_key'] || process.env.BREVO_API_KEY || '';
        const senderEmail = settingsMap['sender_email'] || settingsMap['smtp_from'] || process.env.SENDER_EMAIL || process.env.SMTP_FROM || '';
        const senderName = settingsMap['sender_name'] || process.env.SENDER_NAME || 'LeadForge';
        const brevoConfigured = !!brevoApiKey;

        return NextResponse.json({
            smtp: {
                host: 'api.brevo.com',
                port: '443',
                user: brevoApiKey ? '(API Key set)' : '',
                from: senderEmail,
                configured: brevoConfigured,
            },
            brevo: {
                apiKey: brevoApiKey ? '***' + brevoApiKey.slice(-8) : '',
                senderEmail,
                senderName,
                configured: brevoConfigured,
            },
            googleMaps: {
                configured: !!process.env.GOOGLE_MAPS_API_KEY,
            },
            scoring: scoringConfig,
            caps,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST update settings
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { section, data } = body;

        switch (section) {
            case 'scoring': {
                const existing = await prisma.scoringConfig.findFirst({ where: { isActive: true } });
                if (existing) {
                    await prisma.scoringConfig.update({
                        where: { id: existing.id },
                        data,
                    });
                } else {
                    await prisma.scoringConfig.create({ data });
                }
                break;
            }

            case 'caps': {
                const existingCaps = await getOrCreateCaps();
                await prisma.apiUsageCap.update({
                    where: { id: existingCaps.id },
                    data,
                });
                break;
            }

            case 'smtp':
            case 'brevo': {
                // Support saving Brevo API key and sender info
                const keyMap: Record<string, string> = {
                    apiKey: 'brevo_api_key',
                    senderEmail: 'sender_email',
                    senderName: 'sender_name',
                    // Legacy SMTP keys for backward compatibility
                    host: 'smtp_host',
                    port: 'smtp_port',
                    user: 'smtp_user',
                    pass: 'smtp_pass',
                    from: 'smtp_from',
                };
                for (const [key, value] of Object.entries(data)) {
                    const dbKey = keyMap[key] || key;
                    await prisma.setting.upsert({
                        where: { key: dbKey },
                        update: { value: String(value) },
                        create: { key: dbKey, value: String(value) },
                    });
                }
                break;
            }

            case 'verify_smtp': {
                const result = await verifySmtp();
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

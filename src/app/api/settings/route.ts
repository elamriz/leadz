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

        return NextResponse.json({
            smtp: {
                host: settingsMap['smtp_host'] || process.env.SMTP_HOST || 'smtp.gmail.com',
                port: settingsMap['smtp_port'] || process.env.SMTP_PORT || '587',
                user: settingsMap['smtp_user'] ? '••••••' : '',
                configured: !!settingsMap['smtp_user'] || !!process.env.SMTP_USER,
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

            case 'smtp': {
                for (const [key, value] of Object.entries(data)) {
                    await prisma.setting.upsert({
                        where: { key: `smtp_${key}` },
                        update: { value: String(value) },
                        create: { key: `smtp_${key}`, value: String(value) },
                    });
                }
                break;
            }

            case 'verify_smtp': {
                const result = await verifySmtp({
                    host: data.host,
                    port: parseInt(data.port),
                    user: data.user,
                    pass: data.pass,
                    from: data.from || data.user,
                });
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

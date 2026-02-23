import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getIntegrationConfig } from '@/lib/integrations';
import {
  generateTemplatesWithOpenRouter,
  type GeneratedTemplate,
} from '@/lib/openrouter';

function buildTemplateName(baseName: string, index: number): string {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${baseName || 'AI Template'} (${stamp} #${index + 1})`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = String(body?.prompt || '').trim();
    const count = Math.max(1, Math.min(8, Number(body?.count || 3)));
    const channel = body?.channel === 'whatsapp' ? 'whatsapp' : 'email';
    const language = body?.language === 'en' ? 'en' : 'fr';
    const niche = body?.niche ? String(body.niche).trim() : undefined;
    const save = Boolean(body?.save);

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const integrations = await getIntegrationConfig();
    if (!integrations.openRouterApiKey) {
      return NextResponse.json(
        {
          error:
            'OpenRouter is not configured. Add OPENROUTER_API_KEY (env) or openrouter_api_key (settings).',
        },
        { status: 503 }
      );
    }

    const generated = await generateTemplatesWithOpenRouter({
      apiKey: integrations.openRouterApiKey,
      model: integrations.openRouterModel || 'openrouter/free',
      prompt,
      channel,
      language,
      count,
      niche,
    });

    if (!save) {
      return NextResponse.json({
        templates: generated,
        saved: 0,
        model: integrations.openRouterModel || 'openrouter/free',
      });
    }

    const created = [];
    for (let i = 0; i < generated.length; i++) {
      const template = generated[i] as GeneratedTemplate;
      const createdTemplate = await prisma.emailTemplate.create({
        data: {
          name: buildTemplateName(template.name, i),
          subject: template.subject,
          body: template.body,
          type: channel,
          language,
          tags: template.tags || [],
          variables: extractVariables(template.subject, template.body),
          niche: niche || null,
        },
      });
      created.push(createdTemplate);
    }

    return NextResponse.json({
      templates: created,
      saved: created.length,
      model: integrations.openRouterModel || 'openrouter/free',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractVariables(subject: string, body: string): string[] {
  const detected: string[] = [];
  const regex = /\{(\w+)\}/g;
  const source = `${subject} ${body}`;
  let match;
  while ((match = regex.exec(source)) !== null) {
    if (!detected.includes(match[1])) detected.push(match[1]);
  }
  return detected;
}

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

export interface GenerateTemplateRequest {
  apiKey: string;
  model: string;
  prompt: string;
  channel: 'email' | 'whatsapp';
  language: 'fr' | 'en';
  count: number;
  niche?: string;
}

export interface GeneratedTemplate {
  name: string;
  subject: string;
  body: string;
  tags: string[];
}

function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function parseGeneratedTemplates(content: string): GeneratedTemplate[] {
  const normalized = stripMarkdownCodeFence(content);
  const parsed = JSON.parse(normalized) as { templates?: GeneratedTemplate[] };
  if (!parsed.templates || !Array.isArray(parsed.templates)) {
    throw new Error('Invalid OpenRouter response format (templates missing)');
  }

  const sanitized = parsed.templates
    .map((template) => ({
      name: String(template.name || '').trim(),
      subject: String(template.subject || '').trim(),
      body: String(template.body || '').trim(),
      tags: Array.isArray(template.tags)
        ? template.tags.map((tag) => String(tag).trim()).filter(Boolean)
        : [],
    }))
    .filter((template) => template.name && template.subject && template.body);

  if (sanitized.length === 0) {
    throw new Error('OpenRouter returned no usable templates');
  }
  return sanitized;
}

export async function generateTemplatesWithOpenRouter(
  input: GenerateTemplateRequest
): Promise<GeneratedTemplate[]> {
  const {
    apiKey,
    model,
    prompt,
    channel,
    language,
    count,
    niche,
  } = input;

  if (!apiKey) {
    throw new Error('OpenRouter API key is missing');
  }

  const systemPrompt = [
    'You generate outbound prospecting templates.',
    'Return STRICT JSON only with shape: {"templates":[{"name":"","subject":"","body":"","tags":["..."]}]}',
    `Generate exactly ${count} templates.`,
    `Language: ${language === 'fr' ? 'French' : 'English'}.`,
    `Channel: ${channel}.`,
    'Keep placeholders in braces (e.g. {company_name}, {city}, {website}, {niche}, {phone}, {rating}, {review_count}).',
    'Keep content compliant and professional. No fake claims. No spammy wording.',
  ].join(' ');

  const userPrompt = [
    `Goal: ${prompt}`,
    niche ? `Niche context: ${niche}` : '',
    'Generate varied angles (problem-focused, social-proof, direct CTA, short variant).',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'LeadForge',
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      max_tokens: 2200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter returned empty content');
  }

  return parseGeneratedTemplates(content);
}

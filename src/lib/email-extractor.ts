import * as cheerio from 'cheerio';

// ─── Types ──────────────────────────────────────────────────────
export interface ExtractedEmail {
    email: string;
    source: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'GUESSED';
    isGeneric: boolean;
}

export interface WebsiteAudit {
    url: string;
    httpsPresent: boolean;
    mobileFriendly: boolean;
    loadTimeMs: number;
    hasTitle: boolean;
    hasDescription: boolean;
    hasMetaTags: boolean;
    outdatedTech: boolean;
    errors: string[];
}

// ─── Constants ──────────────────────────────────────────────────
const GENERIC_PREFIXES = [
    'info', 'contact', 'hello', 'support', 'admin', 'office',
    'sales', 'help', 'service', 'team', 'mail', 'enquiry',
    'enquiries', 'reception', 'general', 'bonjour',
];

const EMAIL_REGEX = /(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

const CONTACT_PATHS = ['/', '/contact', '/about', '/about-us', '/legal', '/mentions-legales', '/impressum', '/kontakt'];

const USER_AGENT = 'Mozilla/5.0 (compatible; LeadForge/1.0; +https://leadforge.dev)';

// ─── Fetch page with timeout ────────────────────────────────────
async function fetchPage(url: string, timeoutMs = 10000): Promise<{ html: string; loadTime: number } | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            signal: controller.signal,
            redirect: 'follow',
        });
        if (!response.ok) return null;
        const html = await response.text();
        const loadTime = Date.now() - start;
        return { html, loadTime };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

// ─── Extract emails from HTML ───────────────────────────────────
function extractEmailsFromHtml(html: string, pageUrl: string): ExtractedEmail[] {
    const emails: Map<string, ExtractedEmail> = new Map();

    // Find in raw HTML
    const matches = html.match(EMAIL_REGEX) || [];
    for (const email of matches) {
        const lower = email.toLowerCase();
        if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.gif')) continue;
        if (lower.includes('example.com') || lower.includes('sentry.io')) continue;

        const prefix = lower.split('@')[0];
        const isGeneric = GENERIC_PREFIXES.some(g => prefix === g || prefix.startsWith(g + '.'));

        if (!emails.has(lower)) {
            emails.set(lower, {
                email: lower,
                source: pageUrl,
                confidence: 'HIGH',
                isGeneric,
            });
        }
    }

    // Extract from mailto: links
    const $ = cheerio.load(html);
    $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
            const email = href.replace('mailto:', '').split('?')[0].toLowerCase().trim();
            if (email && email.includes('@') && !emails.has(email)) {
                const prefix = email.split('@')[0];
                const isGeneric = GENERIC_PREFIXES.some(g => prefix === g || prefix.startsWith(g + '.'));
                emails.set(email, {
                    email,
                    source: pageUrl,
                    confidence: 'HIGH',
                    isGeneric,
                });
            }
        }
    });

    return Array.from(emails.values());
}

// ─── Main: Extract emails from a website ────────────────────────
export async function extractEmails(websiteUrl: string): Promise<ExtractedEmail[]> {
    const allEmails: Map<string, ExtractedEmail> = new Map();
    const baseUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;

    let base: URL;
    try {
        base = new URL(baseUrl);
    } catch {
        return [];
    }

    for (const path of CONTACT_PATHS) {
        try {
            const url = `${base.origin}${path}`;
            const result = await fetchPage(url);
            if (result) {
                const emails = extractEmailsFromHtml(result.html, url);
                for (const email of emails) {
                    if (!allEmails.has(email.email)) {
                        allEmails.set(email.email, email);
                    }
                }
            }
        } catch {
            // Skip pages that fail
        }
    }

    return Array.from(allEmails.values());
}

// ─── Website Audit ──────────────────────────────────────────────
export async function auditWebsite(websiteUrl: string): Promise<WebsiteAudit> {
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    const audit: WebsiteAudit = {
        url,
        httpsPresent: url.startsWith('https'),
        mobileFriendly: true,
        loadTimeMs: 0,
        hasTitle: false,
        hasDescription: false,
        hasMetaTags: false,
        outdatedTech: false,
        errors: [],
    };

    try {
        const result = await fetchPage(url, 15000);
        if (!result) {
            audit.errors.push('Failed to load website');
            return audit;
        }

        audit.loadTimeMs = result.loadTime;

        const $ = cheerio.load(result.html);

        // Check title
        const title = $('title').text().trim();
        audit.hasTitle = title.length > 0;

        // Check meta description
        const description = $('meta[name="description"]').attr('content');
        audit.hasDescription = !!description && description.length > 0;

        // Check for viewport meta tag (mobile-friendliness heuristic)
        const viewport = $('meta[name="viewport"]').attr('content');
        audit.mobileFriendly = !!viewport;

        // Meta tags present = has either title or description
        audit.hasMetaTags = audit.hasTitle || audit.hasDescription;

        // Check for outdated tech signals
        const html = result.html.toLowerCase();
        const outdatedSignals = [
            'jquery/1.',
            'bootstrap/2.',
            'bootstrap/3.',
            '<marquee',
            '<blink',
            '<frame',
            '<frameset',
            'ie=edge',
        ];
        audit.outdatedTech = outdatedSignals.some(signal => html.includes(signal));

        // Slow load heuristic
        if (audit.loadTimeMs > 5000) {
            audit.errors.push('Slow page load');
        }

    } catch (error) {
        audit.errors.push(`Audit error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return audit;
}

// ─── Classify Email ─────────────────────────────────────────────
export function classifyEmail(email: string): { isGeneric: boolean; prefix: string } {
    const prefix = email.split('@')[0].toLowerCase();
    const isGeneric = GENERIC_PREFIXES.some(g => prefix === g || prefix.startsWith(g + '.'));
    return { isGeneric, prefix };
}

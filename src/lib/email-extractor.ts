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
    isAccessible: boolean; // Site reachable?
    // Infrastructure
    httpsPresent: boolean;
    loadTimeMs: number;
    // SEO
    hasTitle: boolean;
    hasDescription: boolean;
    hasMetaTags: boolean;
    titleLength: number;
    hasH1: boolean;
    multipleH1: boolean;
    hasOgTags: boolean;
    hasStructuredData: boolean;
    hasCanonical: boolean;
    imagesWithoutAlt: number;
    // Mobile & UX
    mobileFriendly: boolean;
    hasResponsiveImages: boolean;
    hasFlash: boolean;
    hasLazyImages: boolean;
    // Performance
    htmlSizeBytes: number;
    scriptCount: number;
    stylesheetCount: number;
    // Design quality
    inlineStyleCount: number;
    imageCount: number;
    usesTables: boolean;
    hasFavicon: boolean;
    hasSemanticHtml: boolean;
    usesDefaultFonts: boolean;
    // Tech
    outdatedTech: boolean;
    oldDoctype: boolean;
    oldCmsDetected: string | null;
    // Sub-scores (0-100, higher = worse site = better lead)
    designScore: number;
    seoScore: number;
    performanceScore: number;
    techScore: number;
    // Legacy
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

const OUTDATED_TECH_PATTERNS = [
    'jquery/1.', 'jquery-1.', 'jquery/2.', 'jquery-2.',
    'bootstrap/2.', 'bootstrap/3.',
    '<marquee', '<blink', '<frame', '<frameset',
    '<center', '<font ', 'bgcolor=',
    '<!--[if ie', '<!--[if lt ie', '@cc_on', '-ms-filter',
];

const OLD_CMS_PATTERNS: { pattern: string; name: string }[] = [
    { pattern: '/media/system/js/mootools', name: 'Joomla 1.x/2.x' },
    { pattern: 'joomla! 1.', name: 'Joomla 1.x' },
    { pattern: '/misc/drupal.js', name: 'Drupal 6/7' },
    { pattern: 'drupal.settings', name: 'Drupal (old)' },
    { pattern: 'generator" content="wordpress 3.', name: 'WordPress 3.x' },
    { pattern: 'generator" content="wordpress 4.', name: 'WordPress 4.x' },
    { pattern: 'generator" content="joomla', name: 'Joomla' },
    { pattern: 'generator" content="drupal', name: 'Drupal' },
    { pattern: 'wp-content/themes/', name: 'WordPress' },
    { pattern: '/sites/default/files/', name: 'Drupal' },
    { pattern: 'wix.com', name: 'Wix' },
    { pattern: 'squarespace.com', name: 'Squarespace' },
    { pattern: 'weebly.com', name: 'Weebly' },
];

const DEFAULT_FONT_PATTERNS = [
    'times new roman', 'comic sans', 'papyrus', 'impact',
    'courier new', 'arial black',
    "font-family: arial,", "font-family: 'arial'", 'font-family: "arial"',
    "font-family: helvetica,", "font-family: 'helvetica'",
];

// ─── Fetch page with timeout ────────────────────────────────────
async function fetchPage(url: string, timeoutMs = 10000): Promise<{ html: string; loadTime: number; error?: string } | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            signal: controller.signal,
            redirect: 'follow',
        });
        if (!response.ok) return { html: '', loadTime: 0, error: `HTTP ${response.status} ${response.statusText}` };
        const html = await response.text();
        const loadTime = Date.now() - start;
        return { html, loadTime };
    } catch (err) {
        return { html: '', loadTime: 0, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
        clearTimeout(timeout);
    }
}

// ─── Extract emails from HTML ───────────────────────────────────
function extractEmailsFromHtml(html: string, pageUrl: string): ExtractedEmail[] {
    const emails: Map<string, ExtractedEmail> = new Map();

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

// ─── Website Audit (Deep) ───────────────────────────────────────
export async function auditWebsite(websiteUrl: string): Promise<WebsiteAudit> {
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    const audit: WebsiteAudit = {
        url,
        isAccessible: true,
        httpsPresent: url.startsWith('https'),
        loadTimeMs: 0,
        hasTitle: false,
        hasDescription: false,
        hasMetaTags: false,
        titleLength: 0,
        hasH1: false,
        multipleH1: false,
        hasOgTags: false,
        hasStructuredData: false,
        hasCanonical: false,
        imagesWithoutAlt: 0,
        mobileFriendly: true,
        hasResponsiveImages: false,
        hasFlash: false,
        hasLazyImages: false,
        htmlSizeBytes: 0,
        scriptCount: 0,
        stylesheetCount: 0,
        inlineStyleCount: 0,
        imageCount: 0,
        usesTables: false,
        hasFavicon: false,
        hasSemanticHtml: false,
        usesDefaultFonts: false,
        outdatedTech: false,
        oldDoctype: false,
        oldCmsDetected: null,
        designScore: 0,
        seoScore: 0,
        performanceScore: 0,
        techScore: 0,
        errors: [],
    };

    try {
        const result = await fetchPage(url, 15000);
        if (!result || result.error) {
            audit.isAccessible = false;
            audit.errors.push(result?.error || 'Failed to load website');
            // Zero out sub-scores so they don't trigger "Bad Design" logic.
            // Points will be awarded by calculateScore based on isAccessible=false.
            audit.designScore = 0;
            audit.seoScore = 0;
            audit.performanceScore = 0;
            audit.techScore = 0;
            return audit;
        }

        const html = result.html;
        const htmlLower = html.toLowerCase();
        audit.loadTimeMs = result.loadTime;
        audit.htmlSizeBytes = new TextEncoder().encode(html).length;

        const $ = cheerio.load(html);

        // ─── SEO Signals ────────────────────────────────────────
        const title = $('title').text().trim();
        audit.hasTitle = title.length > 0;
        audit.titleLength = title.length;

        const description = $('meta[name="description"]').attr('content');
        audit.hasDescription = !!description && description.length > 0;
        audit.hasMetaTags = audit.hasTitle || audit.hasDescription;

        const h1Tags = $('h1');
        audit.hasH1 = h1Tags.length > 0;
        audit.multipleH1 = h1Tags.length > 1;

        audit.hasOgTags = !!($('meta[property="og:title"]').attr('content') ||
            $('meta[property="og:description"]').attr('content'));
        audit.hasStructuredData = $('script[type="application/ld+json"]').length > 0 ||
            $('[itemscope]').length > 0;
        audit.hasCanonical = $('link[rel="canonical"]').length > 0;

        // Images without alt
        const allImages = $('img');
        audit.imageCount = allImages.length;
        let noAlt = 0;
        allImages.each((_, el) => {
            const alt = $(el).attr('alt');
            if (!alt || alt.trim() === '') noAlt++;
        });
        audit.imagesWithoutAlt = noAlt;

        // ─── Mobile & UX ────────────────────────────────────────
        const viewport = $('meta[name="viewport"]').attr('content');
        audit.mobileFriendly = !!viewport;

        audit.hasResponsiveImages = $('img[srcset]').length > 0 || $('picture').length > 0;
        audit.hasLazyImages = $('img[loading="lazy"]').length > 0;
        audit.hasFlash = $('object').length > 0 || $('embed').length > 0 || $('applet').length > 0;

        // ─── Performance ────────────────────────────────────────
        audit.scriptCount = $('script[src]').length;
        audit.stylesheetCount = $('link[rel="stylesheet"]').length;

        // ─── Design Quality ─────────────────────────────────────
        const inlineStyleElements = $('[style]');
        audit.inlineStyleCount = inlineStyleElements.length;

        // Table-based layout
        const tables = $('table');
        if (tables.length > 0) {
            const nestedTables = $('table table').length;
            const tablesWithRole = $('table[role="presentation"]').length + $('table[role="grid"]').length;
            audit.usesTables = nestedTables > 0 || (tables.length > 2 && tablesWithRole === 0);
        }

        // Favicon
        audit.hasFavicon = $('link[rel="icon"]').length > 0 ||
            $('link[rel="shortcut icon"]').length > 0 ||
            $('link[rel="apple-touch-icon"]').length > 0;

        // Semantic HTML5
        const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'footer', 'aside'];
        const foundSemantic = semanticTags.filter(tag => $(tag).length > 0);
        audit.hasSemanticHtml = foundSemantic.length >= 3;

        // Default / ugly fonts
        audit.usesDefaultFonts = DEFAULT_FONT_PATTERNS.some(f => htmlLower.includes(f));
        const hasWebFonts = htmlLower.includes('fonts.googleapis.com') ||
            htmlLower.includes('use.typekit.net') ||
            htmlLower.includes('fonts.bunny.net') ||
            htmlLower.includes('@font-face');
        if (!hasWebFonts && audit.imageCount < 2) {
            audit.usesDefaultFonts = true;
        }

        // ─── Outdated Tech ──────────────────────────────────────
        audit.outdatedTech = OUTDATED_TECH_PATTERNS.some(pattern => htmlLower.includes(pattern));

        // Old doctype
        const doctypeMatch = html.match(/<!DOCTYPE[^>]*>/i);
        if (!doctypeMatch) {
            audit.oldDoctype = true;
        } else {
            const doctype = doctypeMatch[0].toLowerCase();
            if (doctype.includes('xhtml') || doctype.includes('html 4') || doctype.includes('transitional') || doctype.includes('frameset')) {
                audit.oldDoctype = true;
            }
        }

        // Old CMS detection
        for (const cms of OLD_CMS_PATTERNS) {
            if (htmlLower.includes(cms.pattern)) {
                audit.oldCmsDetected = cms.name;
                break;
            }
        }

        // ─── Calculate Sub-Scores ───────────────────────────────
        // Each sub-score: 0 = good site, 100 = terrible site (good lead)

        // Design Score (0-100)
        let dScore = 0;
        if (audit.usesTables) dScore += 25;
        if (!audit.hasFavicon) dScore += 10;
        if (!audit.hasSemanticHtml) dScore += 15;
        if (audit.usesDefaultFonts) dScore += 15;
        if (audit.inlineStyleCount > 20) dScore += 15;
        else if (audit.inlineStyleCount > 10) dScore += 8;
        if (audit.imageCount === 0) dScore += 15;
        else if (audit.imageCount < 3) dScore += 8;
        if (audit.hasFlash) dScore += 10;
        audit.designScore = Math.min(100, dScore);

        // SEO Score (0-100)
        let sScore = 0;
        if (!audit.hasTitle) sScore += 20;
        else if (audit.titleLength < 10 || audit.titleLength > 70) sScore += 8;
        if (!audit.hasDescription) sScore += 15;
        if (!audit.hasH1) sScore += 15;
        if (audit.multipleH1) sScore += 5;
        if (!audit.hasOgTags) sScore += 10;
        if (!audit.hasStructuredData) sScore += 10;
        if (!audit.hasCanonical) sScore += 8;
        if (audit.imageCount > 0 && audit.imagesWithoutAlt > audit.imageCount * 0.5) sScore += 12;
        if (!audit.hasMetaTags) sScore += 5;
        audit.seoScore = Math.min(100, sScore);

        // Performance Score (0-100)
        let pScore = 0;
        if (audit.loadTimeMs > 5000) pScore += 30;
        else if (audit.loadTimeMs > 3000) pScore += 15;
        else if (audit.loadTimeMs > 2000) pScore += 5;
        if (audit.htmlSizeBytes > 500000) pScore += 20;
        else if (audit.htmlSizeBytes > 200000) pScore += 10;
        if (audit.scriptCount > 15) pScore += 20;
        else if (audit.scriptCount > 8) pScore += 10;
        if (audit.stylesheetCount > 8) pScore += 15;
        else if (audit.stylesheetCount > 5) pScore += 8;
        if (!audit.hasLazyImages && audit.imageCount > 5) pScore += 10;
        audit.performanceScore = Math.min(100, pScore);

        // Tech Score (0-100)
        let tScore = 0;
        if (audit.outdatedTech) tScore += 30;
        if (audit.oldDoctype) tScore += 25;
        if (!audit.mobileFriendly) tScore += 20;
        if (!audit.httpsPresent) tScore += 15;
        if (audit.oldCmsDetected) tScore += 15;
        if (audit.hasFlash) tScore += 15;
        audit.techScore = Math.min(100, tScore);

    } catch (error) {
        audit.errors.push(`Audit error: ${error instanceof Error ? error.message : 'Unknown'}`);
        audit.designScore = 80;
        audit.seoScore = 80;
        audit.performanceScore = 80;
        audit.techScore = 80;
    }

    return audit;
}

// ─── Classify Email ─────────────────────────────────────────────
export function classifyEmail(email: string): { isGeneric: boolean; prefix: string } {
    const prefix = email.split('@')[0].toLowerCase();
    const isGeneric = GENERIC_PREFIXES.some(g => prefix === g || prefix.startsWith(g + '.'));
    return { isGeneric, prefix };
}

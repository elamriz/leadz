// ─── Types ──────────────────────────────────────────────────────
export interface ScoringInput {
    hasWebsite: boolean;
    isAccessible?: boolean; // Default true
    websiteUri?: string | null;
    rating?: number | null;
    userRatingCount?: number | null;
    businessStatus?: string | null;
    nationalPhone?: string | null;
    emailFound: boolean;
    // Infrastructure
    httpsPresent?: boolean;
    mobileFriendly?: boolean;
    loadTimeMs?: number | null;
    hasMetaTags?: boolean;
    outdatedTech?: boolean;
    distanceFromCenter?: number | null;
    recentlyContacted?: boolean;
    // Deep audit sub-scores (0-100, higher = worse site = better lead)
    designScore?: number;
    seoScore?: number;
    performanceScore?: number;
    techScore?: number;
    // Deep audit individual signals
    hasH1?: boolean;
    hasOgTags?: boolean;
    hasStructuredData?: boolean;
    hasCanonical?: boolean;
    hasFavicon?: boolean;
    hasSemanticHtml?: boolean;
    usesDefaultFonts?: boolean;
    usesTables?: boolean;
    hasFlash?: boolean;
    oldDoctype?: boolean;
    oldCmsDetected?: string | null;
    htmlSizeBytes?: number | null;
    scriptCount?: number | null;
    imageCount?: number | null;
    imagesWithoutAlt?: number | null;
}

export interface ScoringWeights {
    // Website opportunity
    noWebsiteWeight: number;
    // Website quality sub-score weights (how much each sub-score contributes)
    designScoreWeight: number;
    seoScoreWeight: number;
    performanceScoreWeight: number;
    techScoreWeight: number;
    // Business reputation
    highRatingWeight: number;
    highRatingThreshold: number;
    reviewCountWeight: number;
    reviewCountThreshold: number;
    highReviewCountWeight: number;
    highReviewCountThreshold: number;
    // Reachability
    hasPhoneWeight: number;
    emailFoundWeight: number;
    // Penalties
    recentContactPenalty: number;
}

export interface ScoringResult {
    score: number;
    topReasons: string[];
    breakdown: Record<string, number>;
}

// ─── Default Weights ────────────────────────────────────────────
export const DEFAULT_WEIGHTS: ScoringWeights = {
    noWebsiteWeight: 30,
    // Sub-score weights: max ~40 pts from website quality
    designScoreWeight: 12,   // max 12 pts from bad design
    seoScoreWeight: 10,      // max 10 pts from bad SEO
    performanceScoreWeight: 8, // max 8 pts from bad perf
    techScoreWeight: 10,     // max 10 pts from bad tech
    // Business reputation: max ~25 pts
    highRatingWeight: 10,
    highRatingThreshold: 4.3,
    reviewCountWeight: 10,
    reviewCountThreshold: 50,
    highReviewCountWeight: 15,
    highReviewCountThreshold: 200,
    // Reachability: max ~15 pts
    hasPhoneWeight: 5,
    emailFoundWeight: 10,
    // Penalties
    recentContactPenalty: 10,
};

// ─── Calculate Score ────────────────────────────────────────────
export function calculateScore(
    input: ScoringInput,
    weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoringResult {
    let score = 0;
    const reasons: string[] = [];
    const breakdown: Record<string, number> = {};

    // ═══════════════════════════════════════════════════════════
    // 1. WEBSITE OPPORTUNITY (max ~40 pts with website, 30 pts without)
    // ═══════════════════════════════════════════════════════════
    if (!input.hasWebsite) {
        score += weights.noWebsiteWeight;
        breakdown['noWebsite'] = weights.noWebsiteWeight;
        reasons.push(`🚫 No website found — strong opportunity for web development (+${weights.noWebsiteWeight})`);
    } else if (input.isAccessible === false) {
        // Website exists but unreachable (DNS/timeout)
        // Score it similar to "no website" but slightly higher opportunity
        const points = weights.noWebsiteWeight + 5;
        score += points;
        breakdown['websiteInaccessible'] = points;
        reasons.push(`🚫 Website Inaccessible (DNS/Server error) — strong opportunity (+${points})`);
    } else {
        // ─── Design Quality Sub-Score ───────────────────────────
        if (input.designScore !== undefined && input.designScore > 0) {
            const pts = Math.round((input.designScore / 100) * weights.designScoreWeight);
            if (pts > 0) {
                score += pts;
                breakdown['designQuality'] = pts;
                const issues: string[] = [];
                if (input.usesTables) issues.push('table layout');
                if (!input.hasFavicon) issues.push('no favicon');
                if (!input.hasSemanticHtml) issues.push('no semantic HTML');
                if (input.usesDefaultFonts) issues.push('default fonts');
                if (input.hasFlash) issues.push('Flash/Java');
                const detail = issues.length > 0 ? ` (${issues.slice(0, 3).join(', ')})` : '';
                reasons.push(`🎨 Poor design quality${detail} — redesign opportunity (+${pts})`);
            }
        }

        // ─── SEO Sub-Score ──────────────────────────────────────
        if (input.seoScore !== undefined && input.seoScore > 0) {
            const pts = Math.round((input.seoScore / 100) * weights.seoScoreWeight);
            if (pts > 0) {
                score += pts;
                breakdown['seoQuality'] = pts;
                const issues: string[] = [];
                if (!input.hasMetaTags) issues.push('missing meta tags');
                if (!input.hasH1) issues.push('no H1');
                if (!input.hasOgTags) issues.push('no social tags');
                if (!input.hasStructuredData) issues.push('no structured data');
                if (!input.hasCanonical) issues.push('no canonical');
                const detail = issues.length > 0 ? ` (${issues.slice(0, 3).join(', ')})` : '';
                reasons.push(`🔍 Poor SEO${detail} — optimization needed (+${pts})`);
            }
        }

        // ─── Performance Sub-Score ──────────────────────────────
        if (input.performanceScore !== undefined && input.performanceScore > 0) {
            const pts = Math.round((input.performanceScore / 100) * weights.performanceScoreWeight);
            if (pts > 0) {
                score += pts;
                breakdown['performance'] = pts;
                const issues: string[] = [];
                if (input.loadTimeMs && input.loadTimeMs > 3000) issues.push(`${Math.round(input.loadTimeMs / 1000)}s load`);
                if (input.scriptCount && input.scriptCount > 8) issues.push(`${input.scriptCount} scripts`);
                if (input.htmlSizeBytes && input.htmlSizeBytes > 200000) issues.push('bloated HTML');
                const detail = issues.length > 0 ? ` (${issues.slice(0, 3).join(', ')})` : '';
                reasons.push(`⚡ Slow/bloated site${detail} — performance fix needed (+${pts})`);
            }
        }

        // ─── Tech Sub-Score ─────────────────────────────────────
        if (input.techScore !== undefined && input.techScore > 0) {
            const pts = Math.round((input.techScore / 100) * weights.techScoreWeight);
            if (pts > 0) {
                score += pts;
                breakdown['techQuality'] = pts;
                const issues: string[] = [];
                if (input.outdatedTech) issues.push('outdated libraries');
                if (input.oldDoctype) issues.push('old doctype');
                if (input.mobileFriendly === false) issues.push('not mobile-friendly');
                if (input.httpsPresent === false) issues.push('no HTTPS');
                if (input.oldCmsDetected) issues.push(input.oldCmsDetected);
                const detail = issues.length > 0 ? ` (${issues.slice(0, 3).join(', ')})` : '';
                reasons.push(`🕸️ Outdated technology${detail} — modernization needed (+${pts})`);
            }
        }

        // ─── Fallback: legacy basic checks if no sub-scores ────
        if (input.designScore === undefined && input.seoScore === undefined) {
            // HTTPS
            if (input.httpsPresent === false) {
                score += 8;
                breakdown['noHttps'] = 8;
                reasons.push('🔒 No HTTPS — security upgrade needed (+8)');
            }
            // Mobile
            if (input.mobileFriendly === false) {
                score += 8;
                breakdown['notMobileFriendly'] = 8;
                reasons.push('📱 Not mobile-friendly — redesign opportunity (+8)');
            }
            // Slow
            if (input.loadTimeMs && input.loadTimeMs > 3000) {
                score += 5;
                breakdown['slowLoad'] = 5;
                reasons.push(`🐌 Slow site (${Math.round(input.loadTimeMs / 1000)}s) — optimization needed (+5)`);
            }
            // No meta
            if (input.hasMetaTags === false) {
                score += 5;
                breakdown['noMetaTags'] = 5;
                reasons.push('🔍 Missing meta tags — SEO needed (+5)');
            }
            // Outdated
            if (input.outdatedTech) {
                score += 5;
                breakdown['outdatedTech'] = 5;
                reasons.push('🕸️ Outdated tech detected (+5)');
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 2. BUSINESS REPUTATION (max ~25 pts)
    // ═══════════════════════════════════════════════════════════
    if (input.rating && input.rating >= weights.highRatingThreshold) {
        score += weights.highRatingWeight;
        breakdown['highRating'] = weights.highRatingWeight;
        reasons.push(`⭐ High Google rating (${input.rating}★) — established business (+${weights.highRatingWeight})`);
    }

    if (input.userRatingCount) {
        if (input.userRatingCount >= weights.highReviewCountThreshold) {
            score += weights.highReviewCountWeight;
            breakdown['highReviewCount'] = weights.highReviewCountWeight;
            reasons.push(`📊 ${input.userRatingCount} reviews — popular business, likely can invest (+${weights.highReviewCountWeight})`);
        } else if (input.userRatingCount >= weights.reviewCountThreshold) {
            score += weights.reviewCountWeight;
            breakdown['reviewCount'] = weights.reviewCountWeight;
            reasons.push(`📊 ${input.userRatingCount} reviews — moderate visibility (+${weights.reviewCountWeight})`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. REACHABILITY (max ~15 pts)
    // ═══════════════════════════════════════════════════════════
    if (input.nationalPhone) {
        score += weights.hasPhoneWeight;
        breakdown['hasPhone'] = weights.hasPhoneWeight;
        reasons.push(`📞 Phone available — direct contact possible (+${weights.hasPhoneWeight})`);
    }

    if (input.emailFound) {
        score += weights.emailFoundWeight;
        breakdown['emailFound'] = weights.emailFoundWeight;
        reasons.push(`📧 Email found — easy outreach (+${weights.emailFoundWeight})`);
    }

    // Business status bonus
    if (input.businessStatus === 'OPERATIONAL') {
        score += 2;
        breakdown['operational'] = 2;
    }

    // ═══════════════════════════════════════════════════════════
    // 4. PENALTIES
    // ═══════════════════════════════════════════════════════════
    if (input.recentlyContacted) {
        score -= weights.recentContactPenalty;
        breakdown['recentContact'] = -weights.recentContactPenalty;
        reasons.push(`⏸️ Recently contacted — reduced priority (-${weights.recentContactPenalty})`);
    }

    // Clamp 0–100
    score = Math.max(0, Math.min(100, score));

    // Top 5 reasons sorted by impact
    const topReasons = reasons.slice(0, 6);

    return { score, topReasons, breakdown };
}

// ─── Batch Score Leads ──────────────────────────────────────────
export function calculateScores(
    leads: ScoringInput[],
    weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoringResult[] {
    return leads.map(lead => calculateScore(lead, weights));
}

// ─── Types ──────────────────────────────────────────────────────
export interface ScoringInput {
    hasWebsite: boolean;
    websiteUri?: string | null;
    rating?: number | null;
    userRatingCount?: number | null;
    businessStatus?: string | null;
    nationalPhone?: string | null;
    emailFound: boolean;
    httpsPresent?: boolean;
    mobileFriendly?: boolean;
    loadTimeMs?: number | null;
    hasMetaTags?: boolean;
    outdatedTech?: boolean;
    distanceFromCenter?: number | null;
    recentlyContacted?: boolean;
}

export interface ScoringWeights {
    noWebsiteWeight: number;
    highRatingWeight: number;
    highRatingThreshold: number;
    reviewCountWeight: number;
    reviewCountThreshold: number;
    highReviewCountWeight: number;
    highReviewCountThreshold: number;
    hasPhoneWeight: number;
    emailFoundWeight: number;
    noHttpsWeight: number;
    notMobileFriendlyWeight: number;
    slowLoadWeight: number;
    slowLoadThreshold: number;
    noMetaTagsWeight: number;
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
    highRatingWeight: 10,
    highRatingThreshold: 4.3,
    reviewCountWeight: 15,
    reviewCountThreshold: 50,
    highReviewCountWeight: 25,
    highReviewCountThreshold: 200,
    hasPhoneWeight: 5,
    emailFoundWeight: 10,
    noHttpsWeight: 10,
    notMobileFriendlyWeight: 10,
    slowLoadWeight: 5,
    slowLoadThreshold: 3000,
    noMetaTagsWeight: 5,
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

    // 1. No website → strong opportunity
    if (!input.hasWebsite) {
        score += weights.noWebsiteWeight;
        breakdown['noWebsite'] = weights.noWebsiteWeight;
        reasons.push(`No website found — strong opportunity for web development services (+${weights.noWebsiteWeight})`);
    } else {
        // Website quality signals
        if (input.httpsPresent === false) {
            score += weights.noHttpsWeight;
            breakdown['noHttps'] = weights.noHttpsWeight;
            reasons.push(`Website lacks HTTPS — security upgrade needed (+${weights.noHttpsWeight})`);
        }

        if (input.mobileFriendly === false) {
            score += weights.notMobileFriendlyWeight;
            breakdown['notMobileFriendly'] = weights.notMobileFriendlyWeight;
            reasons.push(`Website not mobile-friendly — redesign opportunity (+${weights.notMobileFriendlyWeight})`);
        }

        if (input.loadTimeMs && input.loadTimeMs > weights.slowLoadThreshold) {
            score += weights.slowLoadWeight;
            breakdown['slowLoad'] = weights.slowLoadWeight;
            reasons.push(`Slow website (${Math.round(input.loadTimeMs / 1000)}s) — performance optimization needed (+${weights.slowLoadWeight})`);
        }

        if (input.hasMetaTags === false) {
            score += weights.noMetaTagsWeight;
            breakdown['noMetaTags'] = weights.noMetaTagsWeight;
            reasons.push(`Missing meta tags — SEO improvement needed (+${weights.noMetaTagsWeight})`);
        }

        if (input.outdatedTech) {
            score += 5;
            breakdown['outdatedTech'] = 5;
            reasons.push('Uses outdated web technologies (+5)');
        }
    }

    // 2. Google reputation
    if (input.rating && input.rating >= weights.highRatingThreshold) {
        score += weights.highRatingWeight;
        breakdown['highRating'] = weights.highRatingWeight;
        reasons.push(`High Google rating (${input.rating}★) — established business with budget (+${weights.highRatingWeight})`);
    }

    if (input.userRatingCount) {
        if (input.userRatingCount >= weights.highReviewCountThreshold) {
            score += weights.highReviewCountWeight;
            breakdown['highReviewCount'] = weights.highReviewCountWeight;
            reasons.push(`${input.userRatingCount} reviews — popular business, likely can invest (+${weights.highReviewCountWeight})`);
        } else if (input.userRatingCount >= weights.reviewCountThreshold) {
            score += weights.reviewCountWeight;
            breakdown['reviewCount'] = weights.reviewCountWeight;
            reasons.push(`${input.userRatingCount} reviews — moderate visibility (+${weights.reviewCountWeight})`);
        }
    }

    // 3. Phone available
    if (input.nationalPhone) {
        score += weights.hasPhoneWeight;
        breakdown['hasPhone'] = weights.hasPhoneWeight;
        reasons.push(`Phone number available — alternative contact method (+${weights.hasPhoneWeight})`);
    }

    // 4. Email found
    if (input.emailFound) {
        score += weights.emailFoundWeight;
        breakdown['emailFound'] = weights.emailFoundWeight;
        reasons.push(`Email found — easy outreach possible (+${weights.emailFoundWeight})`);
    }

    // 5. Business status
    if (input.businessStatus === 'OPERATIONAL') {
        score += 2;
        breakdown['operational'] = 2;
    }

    // 6. Recently contacted penalty
    if (input.recentlyContacted) {
        score -= weights.recentContactPenalty;
        breakdown['recentContact'] = -weights.recentContactPenalty;
        reasons.push(`Recently contacted — reduced priority (-${weights.recentContactPenalty})`);
    }

    // Clamp score between 0–100
    score = Math.max(0, Math.min(100, score));

    // Sort reasons by impact (already roughly in order, but limit to top 5)
    const topReasons = reasons.slice(0, 5);

    return { score, topReasons, breakdown };
}

// ─── Batch Score Leads ──────────────────────────────────────────
export function calculateScores(
    leads: ScoringInput[],
    weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoringResult[] {
    return leads.map(lead => calculateScore(lead, weights));
}

export const pickByTag = (templates: any[], tag: string) => {
    const matches = templates.filter((t: any) => t.tags.includes(tag));
    if (matches.length === 0) return null;
    return matches[Math.floor(Math.random() * matches.length)];
};

export const pickSmartTemplate = (lead: any, templates: any[]) => {
    const signal = lead.scoringSignals;

    // Segment E: Site indisponible (Inaccessible)
    if (signal && signal.isAccessible === false) {
        const t = pickByTag(templates, 'inaccessible');
        if (t) return t;
    }

    // Segment A: No website (Detects missing URL)
    if (!lead.websiteUri || lead.websiteUri.length < 5) {
        const t = pickByTag(templates, 'no-website');
        if (t) return t;
    }

    // Segment C: Strong Google reputation (Rating > 4.3 AND Reviews > 15)
    if (lead.rating && lead.rating > 4.3 && lead.userRatingCount && lead.userRatingCount > 15) {
        const t = pickByTag(templates, 'reputation');
        if (t) return t;
    }

    // Segment B: Website outdated / low converting
    if (lead.websiteUri && lead.websiteUri.length >= 5) {
        if (signal && (signal.designScore < 60 || signal.performanceScore < 50)) {
            const t = pickByTag(templates, 'outdated-website');
            if (t) return t;
        }
    }

    // Segment D: General presence improvement (Else)
    const t = pickByTag(templates, 'general');
    if (t) return t;

    // Last resort: pick anything available
    return templates[Math.floor(Math.random() * templates.length)];
};

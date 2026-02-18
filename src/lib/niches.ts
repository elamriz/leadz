// Standardized niche list with multilingual support
export const NICHES = [
    'Électriciens / Electricians',
    'Plombiers / Plumbers',
    'Restaurants',
    'Salons de coiffure / Hair salons',
    'Dentistes / Dental clinics',
    'Salles de sport / Gyms & fitness centers',
    'Cabinets d\'avocats / Law firms',
    'Agences immobilières / Real estate agencies',
    'Garages / Auto repair shops',
    'Boulangeries / Bakeries',
    'Cafés / Coffee shops',
    'Hôtels / Hotels',
    'Services de nettoyage / Cleaning services',
    'Salons de tatouage / Tattoo studios',
    'Cabinets d\'architecture / Architecture firms',
    'Cabinets comptables / Accounting firms',
    'Salles de réception / Wedding venues',
    'Toilettage d\'animaux / Pet grooming',
    'Studios photo / Photography studios',
    'Studios de yoga / Yoga studios',
    'Entreprises de construction / Construction companies',
    'Paysagistes / Landscaping',
] as const;

export type Niche = typeof NICHES[number];

// Helper to normalize niche for storage and comparison
export function normalizeNiche(niche: string): string {
    return niche.toLowerCase().trim();
}

// Helper to find matching niche from input
export function findMatchingNiche(input: string): string | null {
    const normalized = normalizeNiche(input);
    return NICHES.find(n => normalizeNiche(n).includes(normalized)) || null;
}

// Extract French or English keyword from niche for search queries
export function extractSearchKeyword(niche: string, language: 'fr' | 'en' = 'fr'): string {
    const parts = niche.split(' / ');
    if (parts.length === 2) {
        return language === 'fr' ? parts[0].trim() : parts[1].trim();
    }
    return niche.trim();
}

// Generate all possible search keywords for a niche (singular, plural, parts)
export function getSearchKeywords(niche: string): string[] {
    const keywords = new Set<string>();

    // 1. Add the full niche string
    keywords.add(niche.toLowerCase().trim());

    // 2. Split by separator if present
    const parts = niche.split(' / ');
    parts.forEach(part => {
        const cleanPart = part.toLowerCase().trim();
        keywords.add(cleanPart);

        // 3. Add singular version if it ends in 's'
        if (cleanPart.endsWith('s')) {
            keywords.add(cleanPart.slice(0, -1));
        }
    });

    return Array.from(keywords);
}

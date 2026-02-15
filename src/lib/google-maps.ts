import Bottleneck from 'bottleneck';

// ─── Types ──────────────────────────────────────────────────────
export interface PlaceSearchResult {
    places: GooglePlace[];
    nextPageToken?: string;
}

export interface GooglePlace {
    id: string;
    displayName?: { text: string; languageCode?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    businessStatus?: string;
    types?: string[];
    location?: { latitude: number; longitude: number };
    primaryType?: string;
}

export interface SearchParams {
    query: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
    maxResults?: number;
    maxPages?: number;
    pageToken?: string;
}

// ─── Rate Limiter ───────────────────────────────────────────────
const limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 100, // 10 req/s max
});

// ─── Constants ──────────────────────────────────────────────────
const PLACES_API_BASE = 'https://places.googleapis.com/v1/places';
const FIELD_MASK = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.nationalPhoneNumber',
    'places.websiteUri',
    'places.rating',
    'places.userRatingCount',
    'places.businessStatus',
    'places.types',
    'places.location',
    'places.primaryType',
].join(',');

const DETAIL_FIELD_MASK = [
    'id',
    'displayName',
    'formattedAddress',
    'nationalPhoneNumber',
    'websiteUri',
    'rating',
    'userRatingCount',
    'businessStatus',
    'types',
    'location',
    'primaryType',
].join(',');

// ─── Retry Logic ────────────────────────────────────────────────
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    delay = 1000
): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429 || response.status >= 500) {
                if (attempt < retries) {
                    const backoff = delay * Math.pow(2, attempt) + Math.random() * 500;
                    await new Promise(r => setTimeout(r, backoff));
                    continue;
                }
            }
            return response;
        } catch (error) {
            if (attempt < retries) {
                const backoff = delay * Math.pow(2, attempt) + Math.random() * 500;
                await new Promise(r => setTimeout(r, backoff));
                continue;
            }
            throw error;
        }
    }
    throw new Error('Max retries exceeded');
}

// ─── Text Search ────────────────────────────────────────────────
export async function textSearch(params: SearchParams): Promise<PlaceSearchResult> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');

    const body: Record<string, unknown> = {
        textQuery: params.query,
        locationBias: {
            circle: {
                center: {
                    latitude: params.latitude,
                    longitude: params.longitude,
                },
                radius: params.radiusKm * 1000, // convert km to meters
            },
        },
        maxResultCount: Math.min(params.maxResults || 20, 20), // API max is 20 per page
    };

    if (params.pageToken) {
        body.pageToken = params.pageToken;
    }

    const response = await limiter.schedule(() =>
        fetchWithRetry(`${PLACES_API_BASE}:searchText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': FIELD_MASK,
            },
            body: JSON.stringify(body),
        })
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Text Search failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    return {
        places: data.places || [],
        nextPageToken: data.nextPageToken,
    };
}

// ─── Place Details ──────────────────────────────────────────────
export async function placeDetails(placeId: string): Promise<GooglePlace> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');

    const response = await limiter.schedule(() =>
        fetchWithRetry(`${PLACES_API_BASE}/${placeId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': DETAIL_FIELD_MASK,
            },
        })
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Place Details failed (${response.status}): ${error}`);
    }

    return response.json();
}

// ─── Cost Estimation ────────────────────────────────────────────
export function estimateCost(
    searchRequests: number,
    detailRequests: number,
    searchCostPer1000 = 32.0,
    detailCostPer1000 = 17.0
): { searchCost: number; detailCost: number; totalCost: number } {
    const searchCost = (searchRequests / 1000) * searchCostPer1000;
    const detailCost = (detailRequests / 1000) * detailCostPer1000;
    return {
        searchCost: Math.round(searchCost * 100) / 100,
        detailCost: Math.round(detailCost * 100) / 100,
        totalCost: Math.round((searchCost + detailCost) * 100) / 100,
    };
}

// ─── Helper: extract domain from URL ────────────────────────────
export function extractDomain(url: string): string | null {
    try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        return parsed.hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

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
    languageCode?: string; // e.g., 'fr', 'en', 'nl'
    regionCode?: string;   // e.g., 'BE', 'FR', 'NL'
    rankPreference?: 'RELEVANCE' | 'DISTANCE';
    useLocationRestriction?: boolean;
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

// ─── Helper: simple bounds calculation (approximate) ────────────
function getBoundsFromCircle(lat: number, lng: number, radiusMeters: number) {
    const latChange = radiusMeters / 111320; // ~111km per degree lat
    const lngChange = radiusMeters / (111320 * Math.cos(lat * (Math.PI / 180)));

    return {
        low: {
            latitude: lat - latChange,
            longitude: lng - lngChange,
        },
        high: {
            latitude: lat + latChange,
            longitude: lng + lngChange,
        },
    };
}

// ─── Helper: generate grid points to cover a search area ────────
// Splits the search circle into a grid of smaller sub-regions
// so each API call discovers different businesses
export function generateGridPoints(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    cellSizeKm: number = 5 // size of each grid cell
): Array<{ latitude: number; longitude: number; radiusKm: number }> {
    const points: Array<{ latitude: number; longitude: number; radiusKm: number }> = [];

    // If radius is small enough for one cell, just return center
    if (radiusKm <= cellSizeKm) {
        return [{ latitude: centerLat, longitude: centerLng, radiusKm }];
    }

    const latPerKm = 1 / 111.32;
    const lngPerKm = 1 / (111.32 * Math.cos(centerLat * (Math.PI / 180)));
    const stepKm = cellSizeKm * 1.4; // overlap a bit to avoid gaps

    const stepsNeeded = Math.ceil(radiusKm / stepKm);

    for (let dy = -stepsNeeded; dy <= stepsNeeded; dy++) {
        for (let dx = -stepsNeeded; dx <= stepsNeeded; dx++) {
            const offsetLat = dy * stepKm * latPerKm;
            const offsetLng = dx * stepKm * lngPerKm;
            const ptLat = centerLat + offsetLat;
            const ptLng = centerLng + offsetLng;

            // Check if this grid point is within the original radius
            const distKm = Math.sqrt(
                Math.pow((ptLat - centerLat) / latPerKm, 2) +
                Math.pow((ptLng - centerLng) / lngPerKm, 2)
            );

            if (distKm <= radiusKm + cellSizeKm * 0.5) {
                points.push({
                    latitude: ptLat,
                    longitude: ptLng,
                    radiusKm: cellSizeKm,
                });
            }
        }
    }

    return points;
}

// ─── Text Search ────────────────────────────────────────────────
export async function textSearch(params: SearchParams): Promise<PlaceSearchResult> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');

    const body: Record<string, unknown> = {
        textQuery: params.query,
        maxResultCount: Math.min(params.maxResults || 20, 20), // API max is 20 per page
    };

    if (params.useLocationRestriction) {
        // locationRestriction requires a Viewport (Rectangle), not Circle
        const rectangle = getBoundsFromCircle(params.latitude, params.longitude, params.radiusKm * 1000);
        body.locationRestriction = { rectangle };
    } else {
        // locationBias supports Circle
        body.locationBias = {
            circle: {
                center: {
                    latitude: params.latitude,
                    longitude: params.longitude,
                },
                radius: params.radiusKm * 1000,
            },
        };
    }

    if (params.pageToken) {
        body.pageToken = params.pageToken;
    }

    if (params.regionCode) {
        body.regionCode = params.regionCode;
    }

    if (params.rankPreference) {
        body.rankPreference = params.rankPreference;
    }

    const response = await limiter.schedule(() =>
        fetchWithRetry(`${PLACES_API_BASE}:searchText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': FIELD_MASK,
                ...(params.languageCode && { 'Accept-Language': params.languageCode }),
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

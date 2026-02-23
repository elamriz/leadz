const HUNTER_BASE_URL = 'https://api.hunter.io/v2';

export interface HunterDomainEmail {
  value: string;
  confidence: number;
  type?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
}

export interface HunterAccountSummary {
  requests: {
    used: number;
    available: number;
  };
}

function normalizeHunterEmail(input: unknown): HunterDomainEmail | null {
  if (!input || typeof input !== 'object') return null;
  const row = input as Record<string, unknown>;
  const value = typeof row.value === 'string' ? row.value.toLowerCase().trim() : '';
  if (!value || !value.includes('@')) return null;

  const confidence =
    typeof row.confidence === 'number' && Number.isFinite(row.confidence)
      ? Math.max(0, Math.min(100, Math.round(row.confidence)))
      : 50;

  return {
    value,
    confidence,
    type: typeof row.type === 'string' ? row.type : undefined,
    firstName: typeof row.first_name === 'string' ? row.first_name : undefined,
    lastName: typeof row.last_name === 'string' ? row.last_name : undefined,
    position: typeof row.position === 'string' ? row.position : undefined,
  };
}

export async function hunterDomainSearch(
  domain: string,
  apiKey: string,
  limit = 5
): Promise<HunterDomainEmail[]> {
  if (!apiKey) return [];
  const normalizedDomain = domain.trim().toLowerCase();
  if (!normalizedDomain) return [];

  const params = new URLSearchParams({
    domain: normalizedDomain,
    limit: String(Math.max(1, Math.min(limit, 10))),
    api_key: apiKey,
  });

  const response = await fetch(`${HUNTER_BASE_URL}/domain-search?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Hunter domain-search failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const emailsRaw = data?.data?.emails;
  if (!Array.isArray(emailsRaw)) return [];

  const emails = emailsRaw
    .map(normalizeHunterEmail)
    .filter((email): email is HunterDomainEmail => email !== null);

  return Array.from(new Map(emails.map((e) => [e.value, e])).values());
}

export async function hunterGetAccount(apiKey: string): Promise<HunterAccountSummary | null> {
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({ api_key: apiKey });
    const response = await fetch(`${HUNTER_BASE_URL}/account?${params.toString()}`);
    if (!response.ok) return null;

    const data = await response.json();
    const requests = data?.data?.requests;
    if (!requests) return null;

    const used = typeof requests.used === 'number' ? requests.used : 0;
    const available = typeof requests.available === 'number' ? requests.available : 0;
    return { requests: { used, available } };
  } catch {
    return null;
  }
}

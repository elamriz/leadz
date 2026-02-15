'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

interface SearchEstimate {
    searchRequests: number;
    detailRequests: number;
    maxPlaces: number;
    searchCost: number;
    detailCost: number;
    totalCost: number;
}

interface SearchResult {
    run: {
        id: string;
        status: string;
        totalPlacesFound: number;
        totalNewLeads: number;
        totalDuplicates: number;
        searchRequests: number;
        detailRequests: number;
        estimatedCost: number;
        errors: string[];
    };
    warnings: string[];
    leadIds: string[];
}

const NICHES = [
    'Electricians', 'Plumbers', 'Restaurants', 'Hair salons', 'Dental clinics',
    'Gyms & fitness centers', 'Law firms', 'Real estate agencies', 'Auto repair shops',
    'Bakeries', 'Coffee shops', 'Hotels', 'Cleaning services', 'Tattoo studios',
    'Architecture firms', 'Accounting firms', 'Wedding venues', 'Pet grooming',
    'Photography studios', 'Yoga studios', 'Construction companies', 'Landscaping',
];

const LOCATIONS = [
    { name: 'Brussels, Belgium', lat: 50.8503, lng: 4.3517 },
    { name: 'Antwerp, Belgium', lat: 51.2194, lng: 4.4025 },
    { name: 'Ghent, Belgium', lat: 51.0543, lng: 3.7174 },
    { name: 'Liège, Belgium', lat: 50.6292, lng: 5.5797 },
    { name: 'Paris, France', lat: 48.8566, lng: 2.3522 },
    { name: 'Amsterdam, Netherlands', lat: 52.3676, lng: 4.9041 },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
    { name: 'Berlin, Germany', lat: 52.52, lng: 13.405 },
    { name: 'New York, USA', lat: 40.7128, lng: -74.006 },
];

export default function SearchPage() {
    const [niche, setNiche] = useState('');
    const [customNiche, setCustomNiche] = useState('');
    const [location, setLocation] = useState('');
    const [customLat, setCustomLat] = useState('');
    const [customLng, setCustomLng] = useState('');
    const [radius, setRadius] = useState('50');
    const [maxResults, setMaxResults] = useState('60');
    const [estimate, setEstimate] = useState<SearchEstimate | null>(null);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [error, setError] = useState('');

    const getSearchParams = () => {
        const selectedNiche = niche === 'custom' ? customNiche : niche;
        const loc = LOCATIONS.find(l => l.name === location);
        return {
            query: `${selectedNiche} in ${location || 'Brussels'}`,
            location: location || 'Brussels',
            latitude: loc?.lat || parseFloat(customLat) || 50.8503,
            longitude: loc?.lng || parseFloat(customLng) || 4.3517,
            radiusKm: parseInt(radius),
            maxResults: parseInt(maxResults),
        };
    };

    const handleEstimate = async () => {
        setEstimating(true);
        setError('');
        try {
            const params = getSearchParams();
            const res = await fetch('/api/search/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...params, dryRun: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setEstimate(data.estimates);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to estimate');
        } finally {
            setEstimating(false);
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const params = getSearchParams();
            const res = await fetch('/api/search/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleEnrichResults = async () => {
        if (!result?.leadIds?.length) return;
        setLoading(true);
        try {
            const res = await fetch('/api/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds: result.leadIds }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert(`Enriched ${data.enriched} leads!`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Enrichment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sidebar>
            <div className="page-header">
                <div>
                    <h2>Search & Discovery</h2>
                    <div className="page-subtitle">Find businesses on Google Maps and add them to your pipeline</div>
                </div>
            </div>

            <div className="page-body">
                <div className="grid-2 animate-in">
                    {/* Search Form */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">🔍 New Search</div>
                        </div>

                        <div className="flex flex-col gap-lg">
                            <div className="form-group">
                                <label className="form-label">Industry / Niche</label>
                                <select className="form-select" value={niche} onChange={e => setNiche(e.target.value)}>
                                    <option value="">Select a niche...</option>
                                    {NICHES.map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                    <option value="custom">Custom...</option>
                                </select>
                                {niche === 'custom' && (
                                    <input
                                        className="form-input"
                                        placeholder="Enter custom niche..."
                                        value={customNiche}
                                        onChange={e => setCustomNiche(e.target.value)}
                                    />
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <select className="form-select" value={location} onChange={e => setLocation(e.target.value)}>
                                    <option value="">Select a location...</option>
                                    {LOCATIONS.map(l => (
                                        <option key={l.name} value={l.name}>{l.name}</option>
                                    ))}
                                    <option value="custom">Custom coordinates...</option>
                                </select>
                                {location === 'custom' && (
                                    <div className="form-row">
                                        <input className="form-input" placeholder="Latitude" value={customLat} onChange={e => setCustomLat(e.target.value)} />
                                        <input className="form-input" placeholder="Longitude" value={customLng} onChange={e => setCustomLng(e.target.value)} />
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Radius (km)</label>
                                    <input className="form-input" type="number" value={radius} onChange={e => setRadius(e.target.value)} min="1" max="500" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Max Results</label>
                                    <input className="form-input" type="number" value={maxResults} onChange={e => setMaxResults(e.target.value)} min="1" max="200" />
                                </div>
                            </div>

                            {error && <div className="alert alert-danger">❌ {error}</div>}

                            <div className="flex gap-md">
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleEstimate}
                                    disabled={!niche || !location || estimating}
                                >
                                    {estimating ? '⏳ Estimating...' : '📊 Dry Run (Estimate)'}
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSearch}
                                    disabled={!niche || !location || loading}
                                >
                                    {loading ? '⏳ Searching...' : '🚀 Run Search'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="flex flex-col gap-lg">
                        {/* Estimate */}
                        {estimate && (
                            <div className="card animate-in">
                                <div className="card-header">
                                    <div className="card-title">📊 Cost Estimate</div>
                                    <span className="badge badge-ready">Dry Run</span>
                                </div>
                                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                    <div>
                                        <div className="text-xs text-muted">Search Requests</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-accent)' }}>{estimate.searchRequests}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted">Detail Requests</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-accent)' }}>{estimate.detailRequests}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted">Max Places</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-accent)' }}>{estimate.maxPlaces}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted">Est. Cost</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--warning)' }}>${estimate.totalCost.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Result */}
                        {result && (
                            <div className="card animate-in">
                                <div className="card-header">
                                    <div className="card-title">✅ Search Complete</div>
                                    <span className="badge badge-ready">{result.run.status}</span>
                                </div>

                                {result.warnings.length > 0 && (
                                    <div className="flex flex-col gap-sm mb-lg">
                                        {result.warnings.map((w, i) => (
                                            <div key={i} className="alert alert-warning">{w}</div>
                                        ))}
                                    </div>
                                )}

                                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                    <div>
                                        <div className="text-xs text-muted">Places Found</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-accent)' }}>{result.run.totalPlacesFound}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted">New Leads</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success)' }}>{result.run.totalNewLeads}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted">Duplicates</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--warning)' }}>{result.run.totalDuplicates}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted">Cost</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-accent)' }}>${result.run.estimatedCost.toFixed(2)}</div>
                                    </div>
                                </div>

                                {result.run.errors.length > 0 && (
                                    <div className="mt-md">
                                        <div className="text-sm text-muted mb-lg">Errors:</div>
                                        {result.run.errors.map((e, i) => (
                                            <div key={i} className="text-xs text-muted">• {e}</div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-md mt-lg">
                                    <button className="btn btn-primary" onClick={handleEnrichResults} disabled={loading}>
                                        {loading ? '⏳ Enriching...' : `🔬 Enrich ${result.leadIds.length} Leads`}
                                    </button>
                                    <a href="/leads" className="btn btn-secondary">
                                        👥 View Leads
                                    </a>
                                </div>
                            </div>
                        )}

                        {!estimate && !result && (
                            <div className="card">
                                <div className="empty-state">
                                    <div className="empty-icon">🗺️</div>
                                    <div>Configure your search parameters and click <strong>Dry Run</strong> to estimate costs, or <strong>Run Search</strong> to start.</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Sidebar>
    );
}

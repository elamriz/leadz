'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';

interface SearchEstimate {
    searchRequests: number;
    detailRequests: number;
    maxPlaces: number;
    gridCells: number;
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

interface SearchRun {
    id: string;
    query: string;
    location: string;
    radiusKm: number;
    status: string;
    totalPlacesFound: number;
    totalNewLeads: number;
    totalDuplicates: number;
    estimatedCost: number;
    createdAt: string;
    _count: { leads: number };
}



const LOCATIONS = [
    { name: 'Brussels, Belgium', lat: 50.8503, lng: 4.3517, region: 'BE' },
    { name: 'Antwerp, Belgium', lat: 51.2194, lng: 4.4025, region: 'BE' },
    { name: 'Ghent, Belgium', lat: 51.0543, lng: 3.7174, region: 'BE' },
    { name: 'Liège, Belgium', lat: 50.6292, lng: 5.5797, region: 'BE' },
    { name: 'Charleroi, Belgium', lat: 50.4108, lng: 4.4446, region: 'BE' },
    { name: 'Namur, Belgium', lat: 50.4674, lng: 4.8720, region: 'BE' },
    { name: 'Paris, France', lat: 48.8566, lng: 2.3522, region: 'FR' },
    { name: 'Amsterdam, Netherlands', lat: 52.3676, lng: 4.9041, region: 'NL' },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278, region: 'GB' },
    { name: 'Berlin, Germany', lat: 52.52, lng: 13.405, region: 'DE' },
    { name: 'Montreal, Canada', lat: 45.5017, lng: -73.5673, region: 'CA' },
    { name: 'New York, USA', lat: 40.7128, lng: -74.006, region: 'US' },
];

// Dynamic import for Leaflet (SSR-safe)
function LeafletMap({ lat, lng, radius, onLocationChange }: {
    lat: number; lng: number; radius: number;
    onLocationChange: (lat: number, lng: number) => void;
}) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const circleRef = useRef<L.Circle | null>(null);

    const initMap = useCallback(async () => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const L = (await import('leaflet')).default;

        // Fix default marker icon
        delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        const map = L.map(mapRef.current).setView([lat, lng], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
        }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        const circle = L.circle([lat, lng], { radius: radius * 1000, color: '#6366f1', fillOpacity: 0.1, weight: 2 }).addTo(map);

        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            circle.setLatLng(pos);
            onLocationChange(pos.lat, pos.lng);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
            marker.setLatLng(e.latlng);
            circle.setLatLng(e.latlng);
            onLocationChange(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        circleRef.current = circle;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // Load Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
            document.head.appendChild(link);
        }
        initMap();
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [initMap]);

    // Update marker/circle when props change
    useEffect(() => {
        if (markerRef.current && circleRef.current && mapInstanceRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            circleRef.current.setLatLng([lat, lng]);
            circleRef.current.setRadius(radius * 1000);
            mapInstanceRef.current.setView([lat, lng], getZoomForRadius(radius));
        }
    }, [lat, lng, radius]);

    return <div ref={mapRef} style={{ height: 280, borderRadius: 12, border: '1px solid var(--border)' }} />;
}

function getZoomForRadius(radiusKm: number): number {
    if (radiusKm <= 2) return 14;
    if (radiusKm <= 5) return 12;
    if (radiusKm <= 10) return 11;
    if (radiusKm <= 25) return 10;
    if (radiusKm <= 50) return 9;
    if (radiusKm <= 100) return 8;
    return 7;
}

export default function SearchPage() {
    const [nicheKeyword, setNicheKeyword] = useState('');
    const [searchLang, setSearchLang] = useState<'fr' | 'en'>('fr');
    const [location, setLocation] = useState('');
    const [customLat, setCustomLat] = useState('50.8503');
    const [customLng, setCustomLng] = useState('4.3517');
    const [radius, setRadius] = useState(25);
    const [maxResults, setMaxResults] = useState('200');
    const [estimate, setEstimate] = useState<SearchEstimate | null>(null);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [error, setError] = useState('');
    const [searchLogs, setSearchLogs] = useState<SearchRun[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    // Groups
    const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    // Fetch search logs
    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch('/api/search/run');
            const data = await res.json();
            if (data.runs) setSearchLogs(data.runs);
        } catch { /* ignore */ }
    }, []);

    // Fetch groups
    const fetchGroups = useCallback(async () => {
        try {
            const res = await fetch('/api/groups');
            const data = await res.json();
            if (data.groups) setGroups(data.groups);
        } catch { /* ignore */ }
    }, []);

    const createGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName }),
            });
            const data = await res.json();
            if (data.group) {
                setGroups(prev => [data.group, ...prev]);
                setSelectedGroupId(data.group.id);
                setIsCreatingGroup(false);
                setNewGroupName('');
            }
        } catch { /* ignore */ }
    };

    useEffect(() => {
        fetchLogs();
        fetchGroups();
    }, [fetchLogs, fetchGroups]);

    const getSearchParams = () => {
        const query = nicheKeyword;

        const loc = LOCATIONS.find(l => l.name === location);
        const lat = loc?.lat || parseFloat(customLat) || 50.8503;
        const lng = loc?.lng || parseFloat(customLng) || 4.3517;
        const regionCode = loc?.region || 'BE';
        const locationName = loc?.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        return {
            query: `${query} in ${locationName}`,
            location: locationName,
            latitude: lat,
            longitude: lng,
            radiusKm: radius,
            maxResults: parseInt(maxResults),
            languageCode: searchLang,
            regionCode,
            groupId: selectedGroupId || undefined, // Send group ID if selected
        };
    };

    const activeLat = LOCATIONS.find(l => l.name === location)?.lat || parseFloat(customLat) || 50.8503;
    const activeLng = LOCATIONS.find(l => l.name === location)?.lng || parseFloat(customLng) || 4.3517;

    const handleMapLocationChange = (lat: number, lng: number) => {
        setLocation('custom');
        setCustomLat(lat.toFixed(6));
        setCustomLng(lng.toFixed(6));
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
            fetchLogs(); // Refresh logs after search
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

    const nicheSelected = nicheKeyword.trim().length > 0;
    const locationSelected = location && (location !== 'custom' || (customLat && customLng));

    return (
        <Sidebar>
            <div className="page-header">
                <div>
                    <h2>Search & Discovery</h2>
                    <div className="page-subtitle">Find businesses on Google Maps and add them to your pipeline</div>
                </div>
                <button className="btn btn-secondary" onClick={() => setShowLogs(!showLogs)}>
                    {showLogs ? '🔍 Search Form' : '📋 Search Logs'}
                </button>
            </div>

            <div className="page-body">
                {showLogs ? (
                    /* Search Logs Panel */
                    <div className="card animate-in">
                        <div className="card-header">
                            <div className="card-title">📋 Recent Search Runs</div>
                            <span className="badge badge-ready">{searchLogs.length} runs</span>
                        </div>
                        {searchLogs.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📭</div>
                                <div>No search runs yet. Run your first search!</div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th>Query</th>
                                            <th>Location</th>
                                            <th>Radius</th>
                                            <th>Found</th>
                                            <th>New</th>
                                            <th>Dupes</th>
                                            <th>Cost</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {searchLogs.map(run => (
                                            <tr key={run.id}>
                                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.query}</td>
                                                <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.location}</td>
                                                <td>{run.radiusKm} km</td>
                                                <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{run.totalPlacesFound}</td>
                                                <td style={{ fontWeight: 600, color: 'var(--success)' }}>{run.totalNewLeads}</td>
                                                <td style={{ color: 'var(--warning)' }}>{run.totalDuplicates}</td>
                                                <td>${(run.estimatedCost || 0).toFixed(2)}</td>
                                                <td>
                                                    <span className={`badge ${run.status === 'completed' ? 'badge-ready' : run.status === 'running' ? 'badge-warning' : 'badge-danger'}`}>
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {new Date(run.createdAt).toLocaleDateString()} {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid-2 animate-in">
                        {/* Search Form */}
                        <div className="flex flex-col gap-lg">
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">🔍 New Search</div>
                                    <div className="flex gap-sm">
                                        <button
                                            className={`btn btn-sm ${searchLang === 'fr' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setSearchLang('fr')}
                                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                        >🇫🇷 FR</button>
                                        <button
                                            className={`btn btn-sm ${searchLang === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setSearchLang('en')}
                                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                        >🇬🇧 EN</button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-lg">
                                    <div className="form-group">
                                        <label className="form-label">Industry / Niche</label>
                                        <input
                                            className="form-input"
                                            placeholder={searchLang === 'fr' ? 'Ex: Électriciens, Plombiers, Restaurants...' : 'Ex: Electricians, Plumbers, Restaurants...'}
                                            value={nicheKeyword}
                                            onChange={e => setNicheKeyword(e.target.value)}
                                        />
                                        <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                                            Type the exact keyword to search on Google Maps ({searchLang === 'fr' ? 'French' : 'English'})
                                        </div>
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
                                            <div className="form-row" style={{ marginTop: 8 }}>
                                                <input className="form-input" placeholder="Latitude" value={customLat} onChange={e => setCustomLat(e.target.value)} />
                                                <input className="form-input" placeholder="Longitude" value={customLng} onChange={e => setCustomLng(e.target.value)} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Interactive radius slider */}
                                    <div className="form-group">
                                        <label className="form-label">
                                            Radius: <strong>{radius} km</strong>
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="200"
                                            value={radius}
                                            onChange={e => setRadius(parseInt(e.target.value))}
                                            style={{
                                                width: '100%',
                                                height: 6,
                                                accentColor: 'var(--accent)',
                                                cursor: 'pointer',
                                            }}
                                        />
                                        <div className="flex" style={{ justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            <span>1 km</span>
                                            <span>50 km</span>
                                            <span>100 km</span>
                                            <span>200 km</span>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Max Results</label>
                                        <input className="form-input" type="number" value={maxResults} onChange={e => setMaxResults(e.target.value)} min="1" max="1000" />
                                    </div>

                                    {/* Group Selection */}
                                    <div className="form-group">
                                        <label className="form-label">Add Leads to Group</label>
                                        <div className="flex gap-sm">
                                            <select
                                                className="form-select"
                                                value={selectedGroupId}
                                                onChange={e => setSelectedGroupId(e.target.value)}
                                            >
                                                <option value="">-- No Group --</option>
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                {isCreatingGroup ? 'Cancel' : 'New Group'}
                                            </button>
                                        </div>

                                        {isCreatingGroup && (
                                            <div className="card p-sm mt-sm bg-muted flex gap-sm items-center animate-in">
                                                <input
                                                    className="form-input"
                                                    placeholder="Group Name"
                                                    value={newGroupName}
                                                    onChange={e => setNewGroupName(e.target.value)}
                                                />
                                                <button className="btn btn-primary btn-sm" onClick={createGroup} disabled={!newGroupName.trim()}>
                                                    Create
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {error && <div className="alert alert-danger">❌ {error}</div>}

                                    <div className="flex gap-md">
                                        <button
                                            className="btn btn-secondary"
                                            onClick={handleEstimate}
                                            disabled={!nicheSelected || !locationSelected || estimating}
                                        >
                                            {estimating ? '⏳ Estimating...' : '📊 Dry Run (Estimate)'}
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleSearch}
                                            disabled={!nicheSelected || !locationSelected || loading}
                                        >
                                            {loading ? '⏳ Searching...' : '🚀 Run Search'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Interactive Map */}
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">🗺️ Search Area</div>
                                    <span className="text-xs text-muted">Click or drag to change location</span>
                                </div>
                                <LeafletMap
                                    lat={activeLat}
                                    lng={activeLng}
                                    radius={radius}
                                    onLocationChange={handleMapLocationChange}
                                />
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
                                            <div className="text-xs text-muted">Grid Cells</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-accent)' }}>{estimate.gridCells}</div>
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
                )}
            </div>
        </Sidebar>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';

interface SettingsData {
    smtp: { host: string; port: string; user: string; configured: boolean };
    googleMaps: { configured: boolean };
    scoring: {
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
    } | null;
    caps: {
        dailySearchLimit: number;
        dailyDetailLimit: number;
        monthlySearchLimit: number;
        monthlyDetailLimit: number;
        perRunSearchLimit: number;
        perRunDetailLimit: number;
        perRunMaxPlaces: number;
        maxPaginationDepth: number;
        searchCostPer1000: number;
        detailCostPer1000: number;
        dailySendLimit: number;
        monthlySendLimit: number;
    } | null;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('scoring');
    const [successMsg, setSuccessMsg] = useState('');

    // Scoring form state
    const [scoringForm, setScoringForm] = useState<Record<string, number>>({});
    // Caps form state
    const [capsForm, setCapsForm] = useState<Record<string, number>>({});

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setSettings(data);
            if (data.scoring) {
                setScoringForm({
                    noWebsiteWeight: data.scoring.noWebsiteWeight,
                    highRatingWeight: data.scoring.highRatingWeight,
                    highRatingThreshold: data.scoring.highRatingThreshold,
                    reviewCountWeight: data.scoring.reviewCountWeight,
                    reviewCountThreshold: data.scoring.reviewCountThreshold,
                    highReviewCountWeight: data.scoring.highReviewCountWeight,
                    highReviewCountThreshold: data.scoring.highReviewCountThreshold,
                    hasPhoneWeight: data.scoring.hasPhoneWeight,
                    emailFoundWeight: data.scoring.emailFoundWeight,
                    noHttpsWeight: data.scoring.noHttpsWeight,
                    notMobileFriendlyWeight: data.scoring.notMobileFriendlyWeight,
                    slowLoadWeight: data.scoring.slowLoadWeight,
                    slowLoadThreshold: data.scoring.slowLoadThreshold,
                    noMetaTagsWeight: data.scoring.noMetaTagsWeight,
                    recentContactPenalty: data.scoring.recentContactPenalty,
                });
            }
            if (data.caps) {
                setCapsForm({
                    dailySearchLimit: data.caps.dailySearchLimit,
                    dailyDetailLimit: data.caps.dailyDetailLimit,
                    monthlySearchLimit: data.caps.monthlySearchLimit,
                    monthlyDetailLimit: data.caps.monthlyDetailLimit,
                    perRunSearchLimit: data.caps.perRunSearchLimit,
                    perRunDetailLimit: data.caps.perRunDetailLimit,
                    perRunMaxPlaces: data.caps.perRunMaxPlaces,
                    maxPaginationDepth: data.caps.maxPaginationDepth,
                    searchCostPer1000: data.caps.searchCostPer1000,
                    detailCostPer1000: data.caps.detailCostPer1000,
                    dailySendLimit: data.caps.dailySendLimit,
                    monthlySendLimit: data.caps.monthlySendLimit,
                });
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const saveSettings = async (section: string, data: Record<string, number>) => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section, data }),
            });
            if (res.ok) {
                setSuccessMsg(`${section} settings saved!`);
                setTimeout(() => setSuccessMsg(''), 3000);
                fetchSettings();
            }
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSaving(false);
        }
    };

    const updateScoring = (key: string, value: number) => {
        setScoringForm(prev => ({ ...prev, [key]: value }));
    };

    const updateCaps = (key: string, value: number) => {
        setCapsForm(prev => ({ ...prev, [key]: value }));
    };

    const renderField = (label: string, key: string, form: Record<string, number>, setter: (k: string, v: number) => void, hint?: string) => (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <input
                className="form-input"
                type="number"
                value={form[key] ?? 0}
                onChange={e => setter(key, parseFloat(e.target.value) || 0)}
            />
            {hint && <div className="text-xs text-muted">{hint}</div>}
        </div>
    );

    return (
        <Sidebar>
            <div className="page-header">
                <div>
                    <h2>Settings</h2>
                    <div className="page-subtitle">Configure scoring weights, API limits, and integrations</div>
                </div>
            </div>

            <div className="page-body">
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner spinner-lg"></div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-lg animate-in">
                        {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}

                        {/* Status Cards */}
                        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div className="kpi-card">
                                <div className="kpi-label">Google Maps API</div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: settings?.googleMaps.configured ? 'var(--success)' : 'var(--danger)' }}>
                                    {settings?.googleMaps.configured ? '✅ Configured' : '❌ Not configured'}
                                </div>
                                <div className="text-xs text-muted">Set via .env.local</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">SMTP Email</div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: settings?.smtp.configured ? 'var(--success)' : 'var(--danger)' }}>
                                    {settings?.smtp.configured ? '✅ Configured' : '❌ Not configured'}
                                </div>
                                <div className="text-xs text-muted">{settings?.smtp.host}:{settings?.smtp.port}</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Scoring Config</div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: settings?.scoring ? 'var(--success)' : 'var(--warning)' }}>
                                    {settings?.scoring ? '✅ Active' : '⚠️ Using defaults'}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="tabs">
                            <button className={`tab ${activeTab === 'scoring' ? 'active' : ''}`} onClick={() => setActiveTab('scoring')}>
                                🎯 Scoring Weights
                            </button>
                            <button className={`tab ${activeTab === 'caps' ? 'active' : ''}`} onClick={() => setActiveTab('caps')}>
                                🔒 API Caps & Limits
                            </button>
                            <button className={`tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
                                ℹ️ Setup Guide
                            </button>
                        </div>

                        {/* Scoring Tab */}
                        {activeTab === 'scoring' && (
                            <div className="card">
                                <div className="card-header">
                                    <div>
                                        <div className="card-title">Lead Scoring Configuration</div>
                                        <div className="card-subtitle">Adjust weights to prioritize different signals</div>
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={() => saveSettings('scoring', scoringForm)} disabled={saving}>
                                        {saving ? '⏳ Saving...' : '💾 Save'}
                                    </button>
                                </div>

                                <div className="flex flex-col gap-xl">
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-accent)' }}>
                                            Website Signals
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                            {renderField('No Website Bonus', 'noWebsiteWeight', scoringForm, updateScoring, 'Points when no website found')}
                                            {renderField('No HTTPS Bonus', 'noHttpsWeight', scoringForm, updateScoring, 'Points for missing SSL')}
                                            {renderField('Not Mobile-Friendly', 'notMobileFriendlyWeight', scoringForm, updateScoring, 'Points for non-responsive site')}
                                        </div>
                                        <div className="form-row mt-md">
                                            {renderField('Slow Load Bonus', 'slowLoadWeight', scoringForm, updateScoring, 'Points for slow websites')}
                                            {renderField('Slow Load Threshold (ms)', 'slowLoadThreshold', scoringForm, updateScoring, 'Load time considered slow')}
                                            {renderField('No Meta Tags Bonus', 'noMetaTagsWeight', scoringForm, updateScoring, 'Points for missing SEO tags')}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-accent)' }}>
                                            Google Reputation
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                            {renderField('High Rating Bonus', 'highRatingWeight', scoringForm, updateScoring, 'Points for high-rated businesses')}
                                            {renderField('Rating Threshold', 'highRatingThreshold', scoringForm, updateScoring, 'Minimum rating for bonus')}
                                            {renderField('Review Count Bonus', 'reviewCountWeight', scoringForm, updateScoring, 'Points for moderate reviews')}
                                        </div>
                                        <div className="form-row mt-md">
                                            {renderField('Review Count Threshold', 'reviewCountThreshold', scoringForm, updateScoring, 'Min reviews for bonus')}
                                            {renderField('High Review Bonus', 'highReviewCountWeight', scoringForm, updateScoring, 'Points for many reviews')}
                                            {renderField('High Review Threshold', 'highReviewCountThreshold', scoringForm, updateScoring, 'Min reviews for high bonus')}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-accent)' }}>
                                            Contact Signals
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                            {renderField('Phone Available Bonus', 'hasPhoneWeight', scoringForm, updateScoring)}
                                            {renderField('Email Found Bonus', 'emailFoundWeight', scoringForm, updateScoring)}
                                            {renderField('Recent Contact Penalty', 'recentContactPenalty', scoringForm, updateScoring, 'Deduction if recently contacted')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Caps Tab */}
                        {activeTab === 'caps' && (
                            <div className="card">
                                <div className="card-header">
                                    <div>
                                        <div className="card-title">API Usage Caps & Limits</div>
                                        <div className="card-subtitle">Set hard limits to prevent unexpected billing</div>
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={() => saveSettings('caps', capsForm)} disabled={saving}>
                                        {saving ? '⏳ Saving...' : '💾 Save'}
                                    </button>
                                </div>

                                <div className="flex flex-col gap-xl">
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-accent)' }}>
                                            Daily Limits
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                            {renderField('Daily Search Requests', 'dailySearchLimit', capsForm, updateCaps)}
                                            {renderField('Daily Detail Requests', 'dailyDetailLimit', capsForm, updateCaps)}
                                            {renderField('Daily Email Sends', 'dailySendLimit', capsForm, updateCaps)}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-accent)' }}>
                                            Monthly Limits
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                            {renderField('Monthly Search Requests', 'monthlySearchLimit', capsForm, updateCaps)}
                                            {renderField('Monthly Detail Requests', 'monthlyDetailLimit', capsForm, updateCaps)}
                                            {renderField('Monthly Email Sends', 'monthlySendLimit', capsForm, updateCaps)}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-accent)' }}>
                                            Per-Run Limits
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                            {renderField('Max Search Requests/Run', 'perRunSearchLimit', capsForm, updateCaps)}
                                            {renderField('Max Detail Requests/Run', 'perRunDetailLimit', capsForm, updateCaps)}
                                        </div>
                                        <div className="form-row mt-md">
                                            {renderField('Max Places/Run', 'perRunMaxPlaces', capsForm, updateCaps)}
                                            {renderField('Max Pagination Depth', 'maxPaginationDepth', capsForm, updateCaps)}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-accent)' }}>
                                            Pricing ($/1000 requests)
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                            {renderField('Search Cost per 1000', 'searchCostPer1000', capsForm, updateCaps, 'Google Maps Text Search pricing')}
                                            {renderField('Details Cost per 1000', 'detailCostPer1000', capsForm, updateCaps, 'Google Maps Place Details pricing')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Info Tab */}
                        {activeTab === 'info' && (
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">Setup Guide</div>
                                </div>
                                <div className="flex flex-col gap-lg">
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-accent)' }}>
                                            1. Google Maps API Key
                                        </h4>
                                        <div className="text-sm text-muted">
                                            <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <li>Go to <a href="https://console.cloud.google.com/apis" target="_blank">Google Cloud Console</a></li>
                                                <li>Enable &quot;Places API (New)&quot;</li>
                                                <li>Create an API key</li>
                                                <li>Add it to <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>.env.local</code> as <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>GOOGLE_MAPS_API_KEY=your-key</code></li>
                                            </ol>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-accent)' }}>
                                            2. SMTP (Email Sending)
                                        </h4>
                                        <div className="text-sm text-muted">
                                            <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <li>For Gmail: Enable 2FA, create an App Password</li>
                                                <li>Add to <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>.env.local</code>:</li>
                                                <li><code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_USER=your@gmail.com</code></li>
                                                <li><code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_PASS=xxxx-xxxx-xxxx-xxxx</code></li>
                                            </ol>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-accent)' }}>
                                            3. Database
                                        </h4>
                                        <div className="text-sm text-muted">
                                            <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <li>Start PostgreSQL locally or via Docker</li>
                                                <li>Set <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>DATABASE_URL</code> in <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>.env.local</code></li>
                                                <li>Run <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>npx prisma migrate dev</code></li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Sidebar>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';

interface SettingsData {
    smtp: { host: string; port: string; user: string; from: string; configured: boolean };
    googleMaps: { configured: boolean };
    scoring: {
        noWebsiteWeight: number;
        designScoreWeight: number;
        seoScoreWeight: number;
        performanceScoreWeight: number;
        techScoreWeight: number;
        highRatingWeight: number;
        highRatingThreshold: number;
        reviewCountWeight: number;
        reviewCountThreshold: number;
        highReviewCountWeight: number;
        highReviewCountThreshold: number;
        hasPhoneWeight: number;
        emailFoundWeight: number;
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
    const [activeTab, setActiveTab] = useState('smtp');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Scoring form state
    const [scoringForm, setScoringForm] = useState<Record<string, number>>({});
    // Caps form state
    const [capsForm, setCapsForm] = useState<Record<string, number>>({});
    // SMTP form state
    const [smtpForm, setSmtpForm] = useState({
        host: '',
        port: '587',
        user: '',
        pass: '',
        from: '',
    });
    const [smtpTesting, setSmtpTesting] = useState(false);
    const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; error?: string } | null>(null);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setSettings(data);
            if (data.smtp) {
                setSmtpForm({
                    host: data.smtp.host || '',
                    port: data.smtp.port || '587',
                    user: data.smtp.user || '',
                    pass: '', // never pre-fill password for security
                    from: data.smtp.from || '',
                });
            }
            if (data.scoring) {
                setScoringForm({
                    noWebsiteWeight: data.scoring.noWebsiteWeight,
                    designScoreWeight: data.scoring.designScoreWeight,
                    seoScoreWeight: data.scoring.seoScoreWeight,
                    performanceScoreWeight: data.scoring.performanceScoreWeight,
                    techScoreWeight: data.scoring.techScoreWeight,
                    highRatingWeight: data.scoring.highRatingWeight,
                    highRatingThreshold: data.scoring.highRatingThreshold,
                    reviewCountWeight: data.scoring.reviewCountWeight,
                    reviewCountThreshold: data.scoring.reviewCountThreshold,
                    highReviewCountWeight: data.scoring.highReviewCountWeight,
                    highReviewCountThreshold: data.scoring.highReviewCountThreshold,
                    hasPhoneWeight: data.scoring.hasPhoneWeight,
                    emailFoundWeight: data.scoring.emailFoundWeight,
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

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setErrorMsg('');
        setTimeout(() => setSuccessMsg(''), 4000);
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setSuccessMsg('');
        setTimeout(() => setErrorMsg(''), 6000);
    };

    const saveSettings = async (section: string, data: Record<string, number>) => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section, data }),
            });
            if (res.ok) {
                showSuccess(`${section} settings saved!`);
                fetchSettings();
            }
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSaving(false);
        }
    };

    const saveSmtp = async () => {
        setSaving(true);
        try {
            const payload: Record<string, string> = {
                host: smtpForm.host,
                port: smtpForm.port,
                user: smtpForm.user,
                from: smtpForm.from || smtpForm.user,
            };
            // Only send password if user typed one
            if (smtpForm.pass) {
                payload.pass = smtpForm.pass;
            }
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'smtp', data: payload }),
            });
            if (res.ok) {
                showSuccess('SMTP settings saved!');
                fetchSettings();
            } else {
                showError('Failed to save SMTP settings.');
            }
        } catch (err) {
            console.error('Failed to save SMTP:', err);
            showError('Failed to save SMTP settings.');
        } finally {
            setSaving(false);
        }
    };

    const testSmtp = async () => {
        setSmtpTesting(true);
        setSmtpTestResult(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section: 'verify_smtp',
                    data: {
                        host: smtpForm.host,
                        port: smtpForm.port,
                        user: smtpForm.user,
                        pass: smtpForm.pass,
                        from: smtpForm.from || smtpForm.user,
                    },
                }),
            });
            const result = await res.json();
            setSmtpTestResult(result);
        } catch (err) {
            setSmtpTestResult({ success: false, error: err instanceof Error ? err.message : 'Connection error' });
        } finally {
            setSmtpTesting(false);
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

    const renderSmtpField = (label: string, key: keyof typeof smtpForm, type: string = 'text', hint?: string) => (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <input
                className="form-input"
                type={type}
                value={smtpForm[key]}
                onChange={e => setSmtpForm(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={key === 'pass' ? '••••••••' : ''}
                autoComplete={key === 'pass' ? 'new-password' : 'off'}
            />
            {hint && <div className="text-xs text-muted">{hint}</div>}
        </div>
    );

    return (
        <Sidebar>
            <div className="page-header">
                <div>
                    <h2>Settings</h2>
                    <div className="page-subtitle">Configure SMTP email, scoring weights, API limits, and integrations</div>
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
                        {errorMsg && <div className="alert alert-danger">❌ {errorMsg}</div>}

                        {/* Status Cards */}
                        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div className="kpi-card">
                                <div className="kpi-label">Google Maps API</div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: settings?.googleMaps.configured ? 'var(--success)' : 'var(--danger)' }}>
                                    {settings?.googleMaps.configured ? '✅ Configured' : '❌ Not configured'}
                                </div>
                                <div className="text-xs text-muted">Set via .env</div>
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
                            <button className={`tab ${activeTab === 'smtp' ? 'active' : ''}`} onClick={() => setActiveTab('smtp')}>
                                📧 SMTP / Email
                            </button>
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

                        {/* SMTP Tab */}
                        {activeTab === 'smtp' && (
                            <div className="card">
                                <div className="card-header">
                                    <div>
                                        <div className="card-title">SMTP Configuration</div>
                                        <div className="card-subtitle">Configure your email sending provider (Brevo, Gmail, etc.)</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={testSmtp}
                                            disabled={smtpTesting || !smtpForm.host || !smtpForm.user}
                                            style={{ minWidth: 140 }}
                                        >
                                            {smtpTesting ? '⏳ Testing...' : '🔌 Test Connection'}
                                        </button>
                                        <button className="btn btn-primary btn-sm" onClick={saveSmtp} disabled={saving}>
                                            {saving ? '⏳ Saving...' : '💾 Save'}
                                        </button>
                                    </div>
                                </div>

                                {smtpTestResult && (
                                    <div
                                        style={{
                                            padding: 'var(--space-md)',
                                            margin: '0 var(--space-lg) var(--space-md)',
                                            borderRadius: 'var(--radius-md)',
                                            background: smtpTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            border: `1px solid ${smtpTestResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                            color: smtpTestResult.success ? '#10b981' : '#ef4444',
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {smtpTestResult.success
                                            ? '✅ SMTP connection successful! Your emails are ready to send.'
                                            : `❌ Connection failed: ${smtpTestResult.error}`}
                                    </div>
                                )}

                                <div className="flex flex-col gap-xl">
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-accent)' }}>
                                            Server Settings
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
                                            {renderSmtpField('SMTP Host', 'host', 'text', 'e.g. smtp-relay.brevo.com, smtp.gmail.com')}
                                            {renderSmtpField('Port', 'port', 'text', '587 (TLS) or 465 (SSL)')}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-accent)' }}>
                                            Authentication
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                            {renderSmtpField('Username / Login', 'user', 'text', 'SMTP login identifier')}
                                            {renderSmtpField('Password / API Key', 'pass', 'password', 'Leave blank to keep existing')}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-accent)' }}>
                                            Sender Identity
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
                                            {renderSmtpField('From Address', 'from', 'email', 'The email address that recipients will see')}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: 'var(--space-md)',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'rgba(99, 102, 241, 0.06)',
                                        border: '1px solid rgba(99, 102, 241, 0.15)',
                                        fontSize: '0.82rem',
                                        color: 'var(--text-muted)',
                                        lineHeight: 1.6,
                                    }}>
                                        <strong style={{ color: 'var(--text-accent)' }}>💡 Brevo (recommended):</strong> Sign up free at{' '}
                                        <a href="https://app.brevo.com" target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>brevo.com</a>
                                        {' '}→ Settings → SMTP & API → Copy your SMTP credentials. Host: <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>smtp-relay.brevo.com</code>, Port: <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>587</code>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                            Website Quality Sub-Scores
                                        </h4>
                                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                            {renderField('No Website Bonus', 'noWebsiteWeight', scoringForm, updateScoring, 'Points when no website found')}
                                            {renderField('Design Quality Weight', 'designScoreWeight', scoringForm, updateScoring, 'Max points from poor design (tables, fonts, etc.)')}
                                            {renderField('SEO Quality Weight', 'seoScoreWeight', scoringForm, updateScoring, 'Max points from bad SEO (meta, H1, OG tags)')}
                                        </div>
                                        <div className="form-row mt-md">
                                            {renderField('Performance Weight', 'performanceScoreWeight', scoringForm, updateScoring, 'Max points from slow/bloated sites')}
                                            {renderField('Tech Quality Weight', 'techScoreWeight', scoringForm, updateScoring, 'Max points from outdated tech (jQuery, old CMS)')}
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
                                                <li>Add it to <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>.env</code> as <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>GOOGLE_MAPS_API_KEY=your-key</code></li>
                                            </ol>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-accent)' }}>
                                            2. SMTP (Email Sending)
                                        </h4>
                                        <div className="text-sm text-muted">
                                            <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <li>Go to the <strong>📧 SMTP / Email</strong> tab above to configure directly in the UI</li>
                                                <li>Or set values in <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>.env</code>: <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_HOST</code>, <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_PORT</code>, <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_USER</code>, <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_PASS</code></li>
                                                <li>For Brevo: host = <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>smtp-relay.brevo.com</code>, port = <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>587</code></li>
                                                <li>For Gmail: Enable 2FA, create an App Password</li>
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
                                                <li>Set <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>DATABASE_URL</code> in <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>.env</code></li>
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

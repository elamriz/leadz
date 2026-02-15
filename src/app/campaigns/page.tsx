'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';

interface Campaign {
    id: string;
    name: string;
    subject: string;
    niche: string | null;
    channel: string;
    noWebsiteOnly: boolean;
    status: string;
    dailyLimit: number;
    cooldownDays: number;
    safeSendMode: boolean;
    totalSent: number;
    totalFailed: number;
    totalBounced: number;
    totalReplied: number;
    template: { id: string; name: string } | null;
    _count: { sends: number };
    createdAt: string;
}

interface Template {
    id: string;
    name: string;
    subject: string;
    type: string;
}

interface WaLink {
    leadId: string;
    name: string;
    phone: string;
    url: string;
    message: string;
}

const NICHES = [
    'Electricians', 'Plumbers', 'Restaurants', 'Hair salons', 'Dental clinics',
    'Gyms & fitness centers', 'Law firms', 'Real estate agencies', 'Auto repair shops',
    'Bakeries', 'Coffee shops', 'Hotels', 'Cleaning services', 'Tattoo studios',
    'Architecture firms', 'Accounting firms', 'Wedding venues', 'Pet grooming',
    'Photography studios', 'Yoga studios', 'Construction companies', 'Landscaping',
];

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [sending, setSending] = useState<string | null>(null);
    const [sendResult, setSendResult] = useState<Record<string, unknown> | null>(null);
    const [waLinks, setWaLinks] = useState<WaLink[]>([]);
    const [showWaModal, setShowWaModal] = useState(false);
    const [waMarked, setWaMarked] = useState<Set<string>>(new Set());

    // Form — Wizard
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
    const [niche, setNiche] = useState('');
    const [customNiche, setCustomNiche] = useState('');
    const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
    const [safeSend, setSafeSend] = useState(true);
    const [templateId, setTemplateId] = useState('');
    const [subject, setSubject] = useState('');
    const [dailyLimit, setDailyLimit] = useState('50');
    const [cooldownDays, setCooldownDays] = useState('30');

    const fetchData = useCallback(async () => {
        try {
            const [campRes, tmplRes] = await Promise.all([
                fetch('/api/campaigns'),
                fetch('/api/templates'),
            ]);
            const campData = await campRes.json();
            const tmplData = await tmplRes.json();
            setCampaigns(campData.campaigns || []);
            setTemplates(tmplData.templates || []);
        } catch (err) {
            console.error('Failed to load:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredTemplates = templates.filter(t => t.type === channel);

    const resetForm = () => {
        setStep(1);
        setName('');
        setChannel('email');
        setNiche('');
        setCustomNiche('');
        setNoWebsiteOnly(false);
        setSafeSend(true);
        setTemplateId('');
        setSubject('');
        setDailyLimit('50');
        setCooldownDays('30');
    };

    const handleCreate = async () => {
        try {
            const selectedNiche = niche === 'custom' ? customNiche : niche === '' ? null : niche;
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    subject,
                    channel,
                    niche: selectedNiche,
                    noWebsiteOnly,
                    templateId: templateId || null,
                    dailyLimit: parseInt(dailyLimit),
                    cooldownDays: parseInt(cooldownDays),
                    safeSendMode: safeSend,
                }),
            });
            if (res.ok) {
                setShowCreate(false);
                resetForm();
                fetchData();
            }
        } catch (err) {
            console.error('Failed to create:', err);
        }
    };

    const handleSend = async (campaignId: string) => {
        setSending(campaignId);
        setSendResult(null);
        setWaLinks([]);
        try {
            const res = await fetch(`/api/campaigns/${campaignId}/send`, { method: 'POST' });
            const data = await res.json();

            if (data.channel === 'whatsapp' && data.waLinks) {
                setWaLinks(data.waLinks);
                setWaMarked(new Set());
                setShowWaModal(true);
            } else {
                setSendResult(data);
            }
            fetchData();
        } catch (err) {
            console.error('Send failed:', err);
        } finally {
            setSending(null);
        }
    };

    const markWaSent = (leadId: string) => {
        setWaMarked(prev => {
            const next = new Set(prev);
            next.add(leadId);
            return next;
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'badge-new';
            case 'ACTIVE': return 'badge-ready';
            case 'PAUSED': return 'badge-queued';
            case 'COMPLETED': return 'badge-sent';
            case 'CANCELLED': return 'badge-do-not-contact';
            default: return 'badge-new';
        }
    };

    const getChannelBadge = (ch: string) => {
        if (ch === 'whatsapp') {
            return { bg: 'rgba(37, 211, 102, 0.15)', color: '#25D366', label: '📱 WhatsApp' };
        }
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: '📧 Email' };
    };

    return (
        <Sidebar>
            <div className="page-header">
                <div>
                    <h2>Campaigns</h2>
                    <div className="page-subtitle">Manage and send email & WhatsApp campaigns</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowCreate(true); }}>
                    + New Campaign
                </button>
            </div>

            <div className="page-body">
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner spinner-lg"></div>
                        <span>Loading campaigns...</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-lg animate-in">
                        {/* Send Result (Email) */}
                        {sendResult && (
                            <div className="alert alert-info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                                <strong>Send Complete</strong>
                                <div className="text-sm">
                                    ✅ Sent: {(sendResult.results as Record<string, number>)?.sent || 0} |
                                    ⏭ Skipped: {(sendResult.results as Record<string, number>)?.skipped || 0} |
                                    ❌ Failed: {(sendResult.results as Record<string, number>)?.failed || 0}
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setSendResult(null)}>Dismiss</button>
                            </div>
                        )}

                        {/* Campaign List */}
                        {campaigns.length === 0 ? (
                            <div className="card">
                                <div className="empty-state">
                                    <div className="empty-icon">📣</div>
                                    <div>No campaigns yet. Create your first campaign to start outreach.</div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-md">
                                {campaigns.map(camp => {
                                    const chBadge = getChannelBadge(camp.channel);
                                    return (
                                        <div key={camp.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ flex: 1 }}>
                                                <div className="flex items-center gap-md">
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{camp.name}</h3>
                                                    <span className={`badge ${getStatusColor(camp.status)}`}>{camp.status}</span>
                                                    <span className="tag" style={{ background: chBadge.bg, color: chBadge.color, fontSize: '0.7rem' }}>
                                                        {chBadge.label}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-muted mt-md" style={{ marginTop: 4 }}>
                                                    Subject: {camp.subject}
                                                </div>
                                                {camp.template && (
                                                    <div className="text-xs text-muted">Template: {camp.template.name}</div>
                                                )}
                                                <div className="flex gap-lg mt-md" style={{ marginTop: 8 }}>
                                                    <span className="text-sm">✅ {camp.totalSent} sent</span>
                                                    <span className="text-sm">💬 {camp.totalReplied} replied</span>
                                                    <span className="text-sm">⚠️ {camp.totalBounced} bounced</span>
                                                    <span className="text-sm">❌ {camp.totalFailed} failed</span>
                                                </div>
                                                <div className="flex gap-sm mt-md" style={{ marginTop: 8 }}>
                                                    {camp.niche && <span className="tag">{camp.niche}</span>}
                                                    {camp.noWebsiteOnly && <span className="tag">🌐 No Website Only</span>}
                                                    {camp.safeSendMode && <span className="tag">🛡 Safe Send</span>}
                                                    <span className="tag">Max {camp.dailyLimit}/day</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-sm" style={{ alignItems: 'flex-end' }}>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleSend(camp.id)}
                                                    disabled={sending === camp.id || camp.status === 'COMPLETED'}
                                                    style={camp.channel === 'whatsapp' ? { background: '#25D366', borderColor: '#25D366' } : {}}
                                                >
                                                    {sending === camp.id ? '⏳ Preparing...' : camp.channel === 'whatsapp' ? '📱 Send via WhatsApp' : '📤 Send'}
                                                </button>
                                                <div className="text-xs text-muted">
                                                    {new Date(camp.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Create Campaign Modal — Wizard */}
                {showCreate && (
                    <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                        <div className="modal" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 style={{ fontWeight: 700 }}>Create Campaign</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
                            </div>

                            {/* Wizard Steps Indicator */}
                            <div style={{
                                display: 'flex',
                                borderBottom: '1px solid var(--border-primary)',
                                padding: '0 var(--space-lg)',
                            }}>
                                {[
                                    { num: 1, label: 'Basics' },
                                    { num: 2, label: 'Audience' },
                                    { num: 3, label: 'Template & Sending' },
                                ].map(s => (
                                    <button
                                        key={s.num}
                                        onClick={() => setStep(s.num)}
                                        style={{
                                            flex: 1,
                                            padding: '12px 0',
                                            textAlign: 'center',
                                            fontSize: '0.85rem',
                                            fontWeight: step === s.num ? 700 : 400,
                                            color: step === s.num ? 'var(--text-accent)' : 'var(--text-secondary)',
                                            borderBottom: step === s.num ? '2px solid var(--text-accent)' : '2px solid transparent',
                                            background: 'none',
                                            border: 'none',
                                            borderBottomWidth: '2px',
                                            borderBottomStyle: 'solid',
                                            borderBottomColor: step === s.num ? 'var(--text-accent)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <span style={{
                                            display: 'inline-flex',
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            background: step >= s.num ? 'var(--text-accent)' : 'var(--bg-tertiary)',
                                            color: step >= s.num ? '#fff' : 'var(--text-secondary)',
                                            marginRight: 6,
                                        }}>{s.num}</span>
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            <div className="modal-body">
                                {/* Step 1: Basics */}
                                {step === 1 && (
                                    <div className="flex flex-col gap-lg">
                                        <div className="form-group">
                                            <label className="form-label">Campaign Name</label>
                                            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Electricians Brussels Q1" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Channel</label>
                                            <div className="flex gap-sm">
                                                <button
                                                    className={`btn ${channel === 'email' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                                    onClick={() => { setChannel('email'); setTemplateId(''); }}
                                                    style={{ flex: 1, padding: '12px' }}
                                                >
                                                    <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>📧</div>
                                                    <div style={{ fontWeight: 600 }}>Email</div>
                                                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>Send via SMTP</div>
                                                </button>
                                                <button
                                                    className={`btn ${channel === 'whatsapp' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                                    onClick={() => { setChannel('whatsapp'); setTemplateId(''); }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '12px',
                                                        ...(channel === 'whatsapp' ? { background: '#25D366', borderColor: '#25D366' } : {}),
                                                    }}
                                                >
                                                    <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>📱</div>
                                                    <div style={{ fontWeight: 600 }}>WhatsApp</div>
                                                    <div className="text-xs text-muted" style={{ marginTop: 2, color: channel === 'whatsapp' ? 'rgba(255,255,255,0.8)' : undefined }}>
                                                        Send via wa.me links
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Audience */}
                                {step === 2 && (
                                    <div className="flex flex-col gap-lg">
                                        <div className="form-group">
                                            <label className="form-label">Target Niche</label>
                                            <select className="form-select" value={niche} onChange={e => setNiche(e.target.value)}>
                                                <option value="">All niches</option>
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
                                                    style={{ marginTop: 8 }}
                                                />
                                            )}
                                        </div>

                                        <div className="flex items-center gap-md" style={{
                                            padding: 'var(--space-md)',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                        }}>
                                            <div
                                                className={`toggle ${noWebsiteOnly ? 'active' : ''}`}
                                                onClick={() => setNoWebsiteOnly(!noWebsiteOnly)}
                                            />
                                            <div>
                                                <div className="text-sm" style={{ fontWeight: 500 }}>🌐 No Website Only</div>
                                                <div className="text-xs text-muted">Only target businesses without a website — perfect for offering web development services</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-md" style={{
                                            padding: 'var(--space-md)',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                        }}>
                                            <div
                                                className={`toggle ${safeSend ? 'active' : ''}`}
                                                onClick={() => setSafeSend(!safeSend)}
                                            />
                                            <div>
                                                <div className="text-sm" style={{ fontWeight: 500 }}>🛡 Safe Send Mode</div>
                                                <div className="text-xs text-muted">Only send to leads never contacted before</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Template & Sending */}
                                {step === 3 && (
                                    <div className="flex flex-col gap-lg">
                                        <div className="form-group">
                                            <label className="form-label">Template</label>
                                            <select className="form-select" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                                                <option value="">Select template...</option>
                                                {filteredTemplates.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            {filteredTemplates.length === 0 && (
                                                <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                                                    No {channel} templates found. <a href="/templates" style={{ color: 'var(--text-accent)' }}>Create one first →</a>
                                                </div>
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Subject Line</label>
                                            <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Better website for {company_name}?" />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Daily Limit</label>
                                                <input className="form-input" type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Cooldown (days)</label>
                                                <input className="form-input" type="number" value={cooldownDays} onChange={e => setCooldownDays(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                {step > 1 && (
                                    <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>← Back</button>
                                )}
                                <div style={{ flex: 1 }} />
                                {step < 3 ? (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setStep(step + 1)}
                                        disabled={step === 1 && !name}
                                    >
                                        Next →
                                    </button>
                                ) : (
                                    <button className="btn btn-primary" onClick={handleCreate} disabled={!name || !subject}>
                                        Create Campaign
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* WhatsApp Send Modal */}
                {showWaModal && (
                    <div className="modal-overlay" onClick={() => setShowWaModal(false)}>
                        <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="flex items-center gap-sm">
                                    <h3 style={{ fontWeight: 700 }}>📱 WhatsApp Outreach</h3>
                                    <span className="tag" style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }}>
                                        {waLinks.length} contacts
                                    </span>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowWaModal(false)}>✕</button>
                            </div>
                            <div className="modal-body" style={{ maxHeight: 500, overflowY: 'auto' }}>
                                {waLinks.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-icon">📱</div>
                                        <div>No eligible leads with phone numbers found for this campaign.</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-sm">
                                        <div className="text-sm text-muted" style={{ marginBottom: 8 }}>
                                            Click each link to open WhatsApp Web with a pre-filled message. Mark as sent after contacting.
                                        </div>
                                        {waLinks.map(link => (
                                            <div key={link.leadId} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: 'var(--space-md)',
                                                background: waMarked.has(link.leadId) ? 'rgba(37, 211, 102, 0.08)' : 'var(--bg-tertiary)',
                                                borderRadius: 'var(--radius-md)',
                                                border: waMarked.has(link.leadId) ? '1px solid rgba(37, 211, 102, 0.3)' : '1px solid var(--border-primary)',
                                                transition: 'all 0.2s',
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{link.name}</div>
                                                    <div className="text-sm text-muted">{link.phone}</div>
                                                </div>
                                                <div className="flex gap-sm items-center">
                                                    {waMarked.has(link.leadId) ? (
                                                        <span className="badge badge-ready">✅ Sent</span>
                                                    ) : (
                                                        <>
                                                            <a
                                                                href={link.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn btn-sm"
                                                                style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}
                                                                onClick={() => markWaSent(link.leadId)}
                                                            >
                                                                📱 Open WhatsApp
                                                            </a>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <div className="text-sm text-muted">
                                    {waMarked.size} of {waLinks.length} contacted
                                </div>
                                <button className="btn btn-ghost" onClick={() => setShowWaModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}

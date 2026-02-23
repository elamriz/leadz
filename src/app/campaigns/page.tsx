'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';


interface Campaign {
    id: string;
    name: string;
    subject: string;
    niche: string | null;
    groupId: string | null;
    channel: string;
    noWebsiteOnly: boolean;
    status: string;
    dailyLimit: number;
    minDelaySeconds: number;
    maxDelaySeconds: number;
    cooldownDays: number;
    safeSendMode: boolean;
    totalSent: number;
    totalFailed: number;
    totalBounced: number;
    totalReplied: number;
    template: { id: string; name: string } | null;
    group: { id: string; name: string; color: string | null } | null;
    senderName?: string | null;
    senderNames?: string[];
    smartSending?: boolean;
    jobStatus?: 'idle' | 'running' | 'done';
    jobTotal?: number;
    totalOpened?: number;
    _count: { sends: number };
    createdAt: string;
}

interface Template {
    id: string;
    name: string;
    subject: string;
    type: string;
    language: string;
}

interface Group {
    id: string;
    name: string;
    color: string | null;
    _count: { leads: number };
}

interface WaLink {
    leadId: string;
    name: string;
    phone: string;
    url: string;
    message: string;
}

function CampaignsContent() {
    const searchParams = useSearchParams();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [sending, setSending] = useState<string | null>(null);
    const [sendResult, setSendResult] = useState<Record<string, unknown> | null>(null);
    const [waLinks, setWaLinks] = useState<WaLink[]>([]);
    const [showWaModal, setShowWaModal] = useState(false);
    const [waMarked, setWaMarked] = useState<Set<string>>(new Set());

    // Test Email
    const [showTestModal, setShowTestModal] = useState<string | null>(null);
    const [testEmail, setTestEmail] = useState('');
    const [testSending, setTestSending] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; error?: string; subject?: string } | null>(null);

    // Form — Wizard
    const [editingId, setEditingId] = useState<string | null>(null);
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
    // nicheVar = template variable {niche}, separate from audience
    const [nicheVar, setNicheVar] = useState('');
    // groupId = audience filter (null = all leads)
    const [groupId, setGroupId] = useState<string>('');
    const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
    const [safeSend, setSafeSend] = useState(true);
    const [templateId, setTemplateId] = useState('');
    const [templateIds, setTemplateIds] = useState<string[]>([]);
    const [campaignLang, setCampaignLang] = useState<'fr' | 'en'>('fr');
    const [senderName, setSenderName] = useState('Zak (Ryzq Digital)');
    const [subject, setSubject] = useState('');
    const [dailyLimit, setDailyLimit] = useState('50');
    const [cooldownDays, setCooldownDays] = useState('30');
    const [smartSending, setSmartSending] = useState(false);
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [minDelay, setMinDelay] = useState('30');
    const [maxDelay, setMaxDelay] = useState('90');

    // Initialize from URL params
    useEffect(() => {
        const leadIds = searchParams.get('selectedLeadIds');
        if (leadIds) {
            const ids = leadIds.split(',').filter(Boolean);
            setSelectedLeadIds(ids);
            setShowCreate(true); // Auto-open modal when leads are selected
            setName(`Targeted Campaign (${ids.length} leads)`);
        }
    }, [searchParams]);

    const fetchData = useCallback(async () => {
        try {
            const [campRes, tmplRes, grpRes] = await Promise.all([
                fetch('/api/campaigns'),
                fetch('/api/templates'),
                fetch('/api/groups'),
            ]);
            const campData = await campRes.json();
            const tmplData = await tmplRes.json();
            const grpData = await grpRes.json();
            setCampaigns(campData.campaigns || []);
            setTemplates(tmplData.templates || []);
            setGroups(grpData.groups || []);
        } catch (err) {
            console.error('Failed to load:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredTemplates = templates.filter(t => t.type === channel && t.language === campaignLang);

    const resetForm = () => {
        setEditingId(null);
        setStep(1);
        setName('');
        setChannel('email');
        setNicheVar('');
        setGroupId('');
        setNoWebsiteOnly(false);
        setSafeSend(true);
        setTemplateId('');
        setTemplateIds([]);
        setCampaignLang('fr');
        setSenderName('Zak (Ryzq Digital)');
        setSubject('');
        setDailyLimit('50');
        setCooldownDays('30');
        setSmartSending(false);
        setSelectedLeadIds([]);
        setMinDelay('30');
        setMaxDelay('90');
    };

    const handleCreate = async () => {
        try {
            const url = editingId ? `/api/campaigns/${editingId}` : '/api/campaigns';
            const method = editingId ? 'PATCH' : 'POST';

            const senderNameList = senderName.split('\n').map(s => s.trim()).filter(Boolean);

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    subject,
                    channel,
                    language: campaignLang,
                    senderName: senderNameList[0] || null,
                    senderNames: senderNameList,
                    niche: nicheVar.trim() || null,   // template variable only
                    groupId: groupId || null,          // audience filter
                    noWebsiteOnly,
                    templateId: templateId || null,
                    templateIds,
                    dailyLimit: parseInt(dailyLimit),
                    minDelaySeconds: parseInt(minDelay),
                    maxDelaySeconds: parseInt(maxDelay),
                    cooldownDays: parseInt(cooldownDays),
                    safeSendMode: safeSend,
                    smartSending,
                    selectedLeadIds,
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

    const handleDelete = async (campaignId: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        try {
            const res = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleEdit = (camp: Campaign) => {
        setEditingId(camp.id);
        setName(camp.name);
        setSubject(camp.subject);
        setChannel(camp.channel as 'email' | 'whatsapp');
        setNicheVar(camp.niche || '');
        setGroupId(camp.groupId || '');
        setNoWebsiteOnly(camp.noWebsiteOnly);
        setSafeSend(camp.safeSendMode);
        setSmartSending(camp.smartSending || false);
        setDailyLimit(camp.dailyLimit.toString());
        setCooldownDays(camp.cooldownDays.toString());
        setMinDelay((camp.minDelaySeconds || 30).toString());
        setMaxDelay((camp.maxDelaySeconds || 90).toString());

        fetch(`/api/campaigns/${camp.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.campaign) {
                    const c = data.campaign;
                    setCampaignLang(c.language as 'fr' | 'en' || 'fr');

                    if (c.senderNames && c.senderNames.length > 0) {
                        setSenderName(c.senderNames.join('\n'));
                    } else {
                        setSenderName(c.senderName || 'Zak (Ryzq Digital)');
                    }

                    setTemplateId(c.templateId || '');
                    setTemplateIds(c.templateIds || []);
                    setSelectedLeadIds(c.selectedLeadIds || []);
                    setStep(1);
                    setShowCreate(true);
                }
            });
    };

    const handleTestSend = async (campaignId: string) => {
        if (!testEmail) return;
        setTestSending(true);
        setTestResult(null);
        try {
            const res = await fetch(`/api/campaigns/${campaignId}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testEmail }),
            });
            const data = await res.json();
            setTestResult(data);
        } catch (err) {
            setTestResult({ success: false, error: String(err) });
        } finally {
            setTestSending(false);
        }
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
                                <strong>Job Queued</strong>
                                <div className="text-sm">
                                    {(sendResult.message as string) || ''}
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setSendResult(null)}>Dismiss</button>
                            </div>
                        )}

                        {/* WORKER POLLING */}
                        <WorkerPoller campaigns={campaigns} onUpdate={fetchData} />

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
                                    const isRunning = camp.jobStatus === 'running';
                                    const progress = (camp.jobTotal || 0) > 0 ? Math.round((camp.totalSent / (camp.jobTotal || 1)) * 100) : 0;

                                    // Calculate real progress based on jobTotal (snapshot at start) vs sends
                                    // Actually, we need to fetch live stats to be accurate.
                                    // Let's use a sub-component for stats to fetch independently.

                                    return (
                                        <div key={camp.id} className="card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div className="flex items-center gap-md">
                                                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{camp.name}</h3>
                                                        <span className={`badge ${getStatusColor(camp.status)}`}>{camp.status}</span>
                                                        <span className="tag" style={{ background: chBadge.bg, color: chBadge.color, fontSize: '0.7rem' }}>
                                                            {chBadge.label}
                                                        </span>
                                                        {isRunning && <span className="badge badge-queued animate-pulse">Running in background...</span>}
                                                    </div>
                                                    <div className="text-sm text-muted mt-md" style={{ marginTop: 4 }}>
                                                        Subject: {camp.subject}
                                                    </div>
                                                    <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                                                        Sender: {camp.senderNames && camp.senderNames.length > 0
                                                            ? `Rotating (${camp.senderNames.length} variations)`
                                                            : (camp.senderName || 'Default')}
                                                    </div>
                                                    {camp.template && (
                                                        <div className="text-xs text-muted" style={{ marginTop: 2 }}>Template: {camp.template.name}</div>
                                                    )}

                                                    {/* Campaign Stats & Progress */}
                                                    <CampaignStats
                                                        campaignId={camp.id}
                                                        initialStats={{
                                                            sent: camp.totalSent,
                                                            opened: camp.totalOpened,
                                                            replied: camp.totalReplied,
                                                            bounced: camp.totalBounced,
                                                            failed: camp.totalFailed
                                                        }}
                                                        isRunning={isRunning}
                                                    />

                                                    <div className="flex gap-sm mt-md" style={{ marginTop: 8 }}>
                                                        {/* Audience badge */}
                                                        {camp.group ? (
                                                            <span className="tag" style={{ background: `${camp.group.color || '#6366f1'}20`, color: camp.group.color || 'var(--text-accent)', border: `1px solid ${camp.group.color || '#6366f1'}40` }}>
                                                                📁 {camp.group.name}
                                                            </span>
                                                        ) : (
                                                            <span className="tag">👥 All Leads</span>
                                                        )}
                                                        {/* Niche as template variable */}
                                                        {camp.niche && <span className="tag">🏷️ {camp.niche}</span>}
                                                        {camp.noWebsiteOnly && <span className="tag">🌐 No Website Only</span>}
                                                        {camp.safeSendMode && <span className="tag">🛡 Safe Send</span>}
                                                        <span className="tag">Max {camp.dailyLimit}/day</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-sm" style={{ alignItems: 'flex-end' }}>
                                                    {/* Resume / Pause / Send Button */}
                                                    {isRunning ? (
                                                        <button className="btn btn-secondary btn-sm" disabled>
                                                            ⏳ Sending...
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleSend(camp.id)}
                                                            disabled={sending === camp.id || camp.status === 'COMPLETED'}
                                                            style={camp.channel === 'whatsapp' ? { background: '#25D366', borderColor: '#25D366' } : {}}
                                                        >
                                                            {sending === camp.id ? '⏳ Queuing...' :
                                                                camp.status === 'ACTIVE' ? '▶ Resume' :
                                                                    camp.channel === 'whatsapp' ? '📱 WhatsApp' : '📤 Start Campaign'}
                                                        </button>
                                                    )}

                                                    {camp.channel === 'email' && !isRunning && (
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => { setShowTestModal(camp.id); setTestEmail(''); setTestResult(null); }}
                                                        >
                                                            🧪 Test Email
                                                        </button>
                                                    )}
                                                    <div className="flex gap-sm">
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleEdit(camp)}
                                                            title="Edit campaign"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm text-danger"
                                                            onClick={() => handleDelete(camp.id)}
                                                            title="Delete campaign"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                    <div className="text-xs text-muted">
                                                        {new Date(camp.createdAt).toLocaleDateString()}
                                                    </div>
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
                                <h3 style={{ fontWeight: 700 }}>{editingId ? 'Edit Campaign' : 'Create Campaign'}</h3>
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
                                        <div className="form-group">
                                            <label className="form-label">Language</label>
                                            <div className="flex gap-sm">
                                                <button
                                                    className={`btn ${campaignLang === 'fr' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                                    onClick={() => { setCampaignLang('fr'); setTemplateId(''); setTemplateIds([]); }}
                                                    style={{ flex: 1, padding: '10px' }}
                                                >
                                                    <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>🇫🇷</div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Français</div>
                                                </button>
                                                <button
                                                    className={`btn ${campaignLang === 'en' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                                    onClick={() => { setCampaignLang('en'); setTemplateId(''); setTemplateIds([]); }}
                                                    style={{ flex: 1, padding: '10px' }}
                                                >
                                                    <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>🇬🇧</div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>English</div>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">🏷️ Niche variable <span className="text-xs text-muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional — injected as <code style={{ fontFamily: 'monospace' }}>{'{niche}'}</code> in templates)</span></label>
                                            <input
                                                className="form-input"
                                                value={nicheVar}
                                                onChange={e => setNicheVar(e.target.value)}
                                                placeholder="e.g. électriciens, plombiers, restaurants..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Audience */}
                                {step === 2 && (
                                    <div className="flex flex-col gap-lg">
                                        {selectedLeadIds.length > 0 && (
                                            <div className="alert-info" style={{ marginBottom: 16 }}>
                                                <strong>🎯 Targeted Campaign:</strong> This campaign will send to {selectedLeadIds.length} specific lead{selectedLeadIds.length !== 1 ? 's' : ''} you selected.
                                            </div>
                                        )}

                                        {/* Group Picker */}
                                        <div className="form-group">
                                            <label className="form-label">🎯 Audience — Target Group</label>
                                            <div className="text-xs text-muted" style={{ marginBottom: 8 }}>
                                                Choose which leads receive this campaign. Select a group or send to all leads.
                                            </div>

                                            {/* All leads option */}
                                            <div
                                                onClick={() => setGroupId('')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: '12px 16px',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${groupId === '' ? 'var(--text-accent)' : 'var(--border-primary)'}`,
                                                    background: groupId === '' ? 'rgba(99,102,241,0.08)' : 'var(--bg-tertiary)',
                                                    cursor: 'pointer',
                                                    marginBottom: 8,
                                                    transition: 'all 0.18s',
                                                }}
                                            >
                                                <span style={{ fontSize: '1.4rem' }}>👥</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600 }}>All Leads</div>
                                                    <div className="text-xs text-muted">Target every eligible lead in the database</div>
                                                </div>
                                                {groupId === '' && (
                                                    <span style={{ color: 'var(--text-accent)', fontWeight: 700 }}>✓</span>
                                                )}
                                            </div>

                                            {/* Group options */}
                                            {groups.length === 0 ? (
                                                <div className="text-xs text-muted" style={{ padding: '8px 0' }}>
                                                    No groups yet. <a href="/leads" style={{ color: 'var(--text-accent)' }}>Create a group in Leads →</a>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-sm">
                                                    {groups.map(g => (
                                                        <div
                                                            key={g.id}
                                                            onClick={() => setGroupId(groupId === g.id ? '' : g.id)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 12,
                                                                padding: '12px 16px',
                                                                borderRadius: 'var(--radius-md)',
                                                                border: `1px solid ${groupId === g.id ? (g.color || '#6366f1') : 'var(--border-primary)'}`,
                                                                background: groupId === g.id ? `${g.color || '#6366f1'}18` : 'var(--bg-tertiary)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.18s',
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    width: 14,
                                                                    height: 14,
                                                                    borderRadius: '50%',
                                                                    background: g.color || '#6366f1',
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 600 }}>{g.name}</div>
                                                                <div className="text-xs text-muted">{g._count.leads} lead{g._count.leads !== 1 ? 's' : ''}</div>
                                                            </div>
                                                            {groupId === g.id && (
                                                                <span style={{ color: g.color || 'var(--text-accent)', fontWeight: 700 }}>✓</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
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
                                            <label className="form-label">Sender Name(s)</label>
                                            <div className="text-xs text-muted" style={{ marginBottom: 6 }}>
                                                Enter one per line to rotate sender names. A random name will be picked for each email to improve deliverability.
                                            </div>
                                            <textarea
                                                className="form-input"
                                                style={{ minHeight: 80, fontFamily: 'inherit' }}
                                                value={senderName}
                                                onChange={e => setSenderName(e.target.value)}
                                                placeholder={"Zak (Ryzq Digital)\nZak from Ryzq\nZakariya E."}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Primary Template</label>
                                            <select className="form-select" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                                                <option value="">Select template...</option>
                                                {filteredTemplates.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            {filteredTemplates.length === 0 && (
                                                <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                                                    No {campaignLang === 'fr' ? 'French' : 'English'} {channel} templates found. <a href="/templates" style={{ color: 'var(--text-accent)' }}>Create one first →</a>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-md" style={{
                                            padding: 'var(--space-md)',
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            marginBottom: 16
                                        }}>
                                            <div
                                                className={`toggle ${smartSending ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSmartSending(!smartSending);
                                                    if (!smartSending) {
                                                        setTemplateId('');
                                                        setTemplateIds([]);
                                                    }
                                                }}
                                            />
                                            <div>
                                                <div className="text-sm" style={{ fontWeight: 600, color: 'var(--text-accent)' }}>✨ Smart Sending</div>
                                                <div className="text-xs text-muted">Automatically select the best template based on lead tags (e.g. Inaccessible, No Website, Reputation)</div>
                                            </div>
                                        </div>

                                        {!smartSending && (
                                            <div className="form-group">
                                                <label className="form-label">Template Rotation (anti-spam)</label>
                                                <div className="text-xs text-muted" style={{ marginBottom: 8 }}>Select multiple templates — each send will randomly pick one to avoid spam filters.</div>
                                                <div className="flex flex-col gap-sm">
                                                    {filteredTemplates.map(t => (
                                                        <label key={t.id} className="flex items-center gap-sm" style={{
                                                            padding: '8px 12px',
                                                            background: templateIds.includes(t.id) ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                                                            borderRadius: 'var(--radius-md)',
                                                            cursor: 'pointer',
                                                            border: templateIds.includes(t.id) ? '1px solid var(--text-accent)' : '1px solid var(--border-primary)',
                                                            transition: 'all 0.2s',
                                                        }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={templateIds.includes(t.id)}
                                                                onChange={() => {
                                                                    setTemplateIds(prev =>
                                                                        prev.includes(t.id)
                                                                            ? prev.filter(id => id !== t.id)
                                                                            : [...prev, t.id]
                                                                    );
                                                                }}
                                                            />
                                                            <span className="text-sm" style={{ fontWeight: 500 }}>{t.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
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

                                        {/* Human-like delay config */}
                                        <div className="form-group">
                                            <label className="form-label">⏱ Délai entre chaque email (comportement humain)</label>
                                            <div className="text-xs text-muted" style={{ marginBottom: 8 }}>Un délai aléatoire entre min et max sera appliqué entre chaque envoi pour éviter d{"'"}être détecté comme spam.</div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label text-xs">Min (secondes)</label>
                                                    <input className="form-input" type="number" value={minDelay} onChange={e => setMinDelay(e.target.value)} min="5" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label text-xs">Max (secondes)</label>
                                                    <input className="form-input" type="number" value={maxDelay} onChange={e => setMaxDelay(e.target.value)} min="10" />
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted" style={{ marginTop: 4 }}>💡 Recommandé : 30-90 secondes pour un comportement naturel</div>
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
                                    <button className="btn btn-primary" onClick={handleCreate} disabled={!name}>
                                        {editingId ? 'Save Changes' : 'Create Campaign'}
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

                {/* Test Email Modal */}
                {showTestModal && (
                    <div className="modal-overlay" onClick={() => setShowTestModal(null)}>
                        <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 style={{ fontWeight: 700 }}>🧪 Send Test Email</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowTestModal(null)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="flex flex-col gap-lg">
                                    <div className="form-group">
                                        <label className="form-label">Recipient Email</label>
                                        <input
                                            className="form-input"
                                            type="email"
                                            value={testEmail}
                                            onChange={e => setTestEmail(e.target.value)}
                                            placeholder="your@email.com"
                                        />
                                        <div className="text-xs text-muted">
                                            A test email will be sent using this campaign&apos;s template with dummy preview data.
                                        </div>
                                    </div>
                                    {testResult && (
                                        <div className={`alert ${testResult.success ? 'alert-success' : 'alert-danger'}`}>
                                            {testResult.success
                                                ? `✅ Test email sent successfully!`
                                                : `❌ Failed: ${testResult.error}`
                                            }
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowTestModal(null)}>Cancel</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleTestSend(showTestModal)}
                                    disabled={!testEmail || testSending}
                                >
                                    {testSending ? '⏳ Sending...' : '📤 Send Test'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar >
    );
}

export default function CampaignsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CampaignsContent />
        </Suspense>
    );
}


function WorkerPoller({ campaigns, onUpdate }: { campaigns: Campaign[], onUpdate: () => void }) {
    useEffect(() => {
        const runningCampaigns = campaigns.filter(c => c.jobStatus === 'running');
        if (runningCampaigns.length === 0) return;

        const timeouts: NodeJS.Timeout[] = [];
        const aborted = { current: false };

        runningCampaigns.forEach(camp => {
            const minDelay = (camp.minDelaySeconds || 30) * 1000;
            const maxDelay = (camp.maxDelaySeconds || 90) * 1000;

            const poll = async () => {
                if (aborted.current) return;
                try {
                    const res = await fetch(`/api/campaigns/${camp.id}/worker`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.processed > 0 || data.jobStatus !== 'running') {
                            onUpdate();
                        }
                        // If job is done, stop polling
                        if (data.jobStatus !== 'running') return;
                    }
                } catch (err) {
                    console.error('Worker poll failed', err);
                }

                if (aborted.current) return;

                // Schedule next poll with random human-like delay
                const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);
                console.log(`[Worker] Next email in ${(randomDelay / 1000).toFixed(0)}s (${camp.name})`);
                const timeout = setTimeout(poll, randomDelay);
                timeouts.push(timeout);
            };

            // Start first poll immediately
            poll();
        });

        return () => {
            aborted.current = true;
            timeouts.forEach(clearTimeout);
        };
    }, [campaigns, onUpdate]);

    return null;
}

function CampaignStats({ campaignId, initialStats, isRunning }: { campaignId: string, initialStats: any, isRunning: boolean }) {
    const [stats, setStats] = useState(initialStats);
    const [loading, setLoading] = useState(false);

    // Poll stats occasionally if running
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning) {
            interval = setInterval(() => {
                fetchStats();
            }, 5000); // 5s stats refresh
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`/api/campaigns/${campaignId}/stats`);
            if (res.ok) {
                const data = await res.json();
                if (data.stats) {
                    setStats((prev: any) => ({ ...prev, ...data.stats }));
                }
            }
        } catch (err) {
            console.error('Stats fetch failed', err);
        }
    };

    const total = (stats.sent || 0) + (stats.queued || 0) + (stats.failed || 0);
    const progress = total > 0 ? Math.round(((stats.sent || 0) + (stats.failed || 0)) / total * 100) : 0;

    return (
        <div className="mt-md p-sm bg-base-200 rounded-md">
            <div className="flex justify-between text-xs mb-xs">
                <span>Progress</span>
                <span>{progress}% ({stats.sent} sent / {total} total)</span>
            </div>
            <div className="h-2 bg-base-300 rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <div className="flex gap-lg mt-sm pt-sm border-t border-base-300">
                <div className="text-center">
                    <div className="text-lg font-bold">{stats.sent}</div>
                    <div className="text-xs text-muted">Sent</div>
                </div>
                <div className="text-center text-success">
                    <div className="text-lg font-bold">{stats.opened || 0}</div>
                    <div className="text-xs text-muted">Opened</div>
                </div>
                <div className="text-center text-info">
                    <div className="text-lg font-bold">{stats.replied || 0}</div>
                    <div className="text-xs text-muted">Replied</div>
                </div>
                <div className="text-center text-warning">
                    <div className="text-lg font-bold">{stats.bounced || 0}</div>
                    <div className="text-xs text-muted">Bounced</div>
                </div>
                {stats.failed > 0 && (
                    <div className="text-center text-danger">
                        <div className="text-lg font-bold">{stats.failed}</div>
                        <div className="text-xs text-muted">Failed</div>
                    </div>
                )}
            </div>
            <div className="flex justify-end mt-xs">
                <button className="btn btn-ghost btn-xs text-xs" onClick={fetchStats}>
                    Refresh Stats ↻
                </button>
            </div>
        </div>
    );
}


'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

interface LeadEmail {
    id: string;
    email: string;
    confidence: string;
    isGeneric: boolean;
}

interface Lead {
    id: string;
    displayName: string;
    formattedAddress: string | null;
    nationalPhone: string | null;
    websiteUri: string | null;
    websiteDomain: string | null;
    rating: number | null;
    userRatingCount: number | null;
    businessStatus: string | null;
    niche: string | null;
    status: string;
    score: number;
    topReasons: string[];
    tags: string[];
    emails: LeadEmail[];
    _count: { campaignSends: number };
    createdAt: string;
}

const SMART_LISTS = [
    { key: '', label: 'All Leads', icon: '👥' },
    { key: 'never_contacted', label: 'Never Contacted', icon: '🆕' },
    { key: 'ready', label: 'Ready to Contact', icon: '✅' },
    { key: 'high_priority', label: 'High Priority', icon: '🔥' },
    { key: 'no_website', label: 'No Website', icon: '🌐' },
    { key: 'contacted', label: 'Already Contacted', icon: '📧' },
    { key: 'follow_up', label: 'Needs Follow-up', icon: '🔔' },
    { key: 'missing_email', label: 'Missing Email', icon: '❓' },
    { key: 'do_not_contact', label: 'Do Not Contact', icon: '🚫' },
];

const STATUS_OPTIONS = ['NEW', 'READY', 'QUEUED', 'SENT', 'BOUNCED', 'REPLIED', 'NOT_INTERESTED', 'FOLLOW_UP', 'DO_NOT_CONTACT'];

function getScoreClass(score: number) {
    if (score >= 60) return 'score-high';
    if (score >= 30) return 'score-medium';
    return 'score-low';
}

function getStatusBadge(status: string) {
    return `badge badge-${status.toLowerCase().replace(/_/g, '-')}`;
}

function formatPhoneForWa(phone: string): string {
    return phone.replace(/[\s\-\(\)\.+]/g, '');
}

function getWaUrl(phone: string, message?: string): string {
    const clean = formatPhoneForWa(phone);
    if (message) {
        return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
    }
    return `https://wa.me/${clean}`;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [smartList, setSmartList] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [sortBy, setSortBy] = useState('score');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [enriching, setEnriching] = useState(false);
    const [showMassWa, setShowMassWa] = useState(false);
    const [waMessage, setWaMessage] = useState('Hi! 👋\n\nI came across your business and wanted to reach out...');
    const [waOpened, setWaOpened] = useState<Set<string>>(new Set());
    const waMessageRef = useRef<HTMLTextAreaElement>(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '25',
                sortBy,
                sortOrder,
            });
            if (smartList) params.set('smartList', smartList);
            if (search) params.set('search', search);

            const res = await fetch(`/api/leads?${params}`);
            const data = await res.json();
            setLeads(data.leads || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotalCount(data.pagination?.totalCount || 0);
        } catch (err) {
            console.error('Failed to load leads:', err);
        } finally {
            setLoading(false);
        }
    }, [page, smartList, search, sortBy, sortOrder]);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setPage(1);
    };

    const handleBulkAction = async (action: string, data?: Record<string, unknown>) => {
        if (selectedIds.size === 0) return;
        try {
            const res = await fetch('/api/leads/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, leadIds: Array.from(selectedIds), data }),
            });
            if (res.ok) {
                setSelectedIds(new Set());
                fetchLeads();
            }
        } catch (err) {
            console.error('Bulk action failed:', err);
        }
    };

    const handleEnrichSelected = async () => {
        if (selectedIds.size === 0) return;
        setEnriching(true);
        try {
            const res = await fetch('/api/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
            });
            if (res.ok) {
                fetchLeads();
                setSelectedIds(new Set());
            }
        } catch (err) {
            console.error('Enrichment failed:', err);
        } finally {
            setEnriching(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === leads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(leads.map(l => l.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    // Get selected leads that have phone numbers for mass WhatsApp
    const selectedLeadsWithPhone = leads.filter(l => selectedIds.has(l.id) && l.nationalPhone);

    const openMassWa = () => {
        setWaOpened(new Set());
        setShowMassWa(true);
    };

    return (
        <Sidebar>
            <div className="page-header">
                <div>
                    <h2>Leads</h2>
                    <div className="page-subtitle">{totalCount} total leads in your pipeline</div>
                </div>
                <div className="flex gap-sm">
                    <button className="btn btn-secondary btn-sm" onClick={fetchLeads}>↻ Refresh</button>
                </div>
            </div>

            <div className="page-body">
                <div className="flex flex-col gap-lg animate-in">
                    {/* Smart List Tabs */}
                    <div className="tabs" style={{ flexWrap: 'wrap' }}>
                        {SMART_LISTS.map(sl => (
                            <button
                                key={sl.key}
                                className={`tab ${smartList === sl.key ? 'active' : ''}`}
                                onClick={() => { setSmartList(sl.key); setPage(1); }}
                            >
                                {sl.icon} {sl.label}
                            </button>
                        ))}
                    </div>

                    {/* Toolbar */}
                    <div className="toolbar">
                        <div className="search-bar" style={{ width: 300 }}>
                            <span>🔍</span>
                            <input
                                placeholder="Search leads..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>

                        {selectedIds.size > 0 && (
                            <div className="flex gap-sm items-center" style={{ flexWrap: 'wrap' }}>
                                <span className="text-sm text-accent">{selectedIds.size} selected</span>
                                <select
                                    className="form-select"
                                    style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
                                    onChange={e => {
                                        if (e.target.value) {
                                            handleBulkAction('change_status', { status: e.target.value });
                                            e.target.value = '';
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="">Change status...</option>
                                    {STATUS_OPTIONS.map(s => (
                                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                                <button className="btn btn-secondary btn-sm" onClick={handleEnrichSelected} disabled={enriching}>
                                    {enriching ? '⏳' : '🔬'} Enrich
                                </button>
                                {selectedLeadsWithPhone.length > 0 && (
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}
                                        onClick={openMassWa}
                                    >
                                        📱 WhatsApp ({selectedLeadsWithPhone.length})
                                    </button>
                                )}
                                <button className="btn btn-danger btn-sm" onClick={() => handleBulkAction('delete')}>
                                    🗑 Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {loading ? (
                            <div className="loading-overlay">
                                <div className="spinner"></div>
                                <span>Loading leads...</span>
                            </div>
                        ) : leads.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📋</div>
                                <div>No leads found for this filter</div>
                                <Link href="/search" className="btn btn-primary btn-sm mt-md">
                                    🔍 Search for leads
                                </Link>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }}>
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={selectedIds.size === leads.length && leads.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th onClick={() => handleSort('score')} style={{ width: 60 }}>
                                            Score {sortBy === 'score' && (sortOrder === 'desc' ? '↓' : '↑')}
                                        </th>
                                        <th onClick={() => handleSort('displayName')}>
                                            Business {sortBy === 'displayName' && (sortOrder === 'desc' ? '↓' : '↑')}
                                        </th>
                                        <th>Contact</th>
                                        <th onClick={() => handleSort('rating')}>
                                            Rating {sortBy === 'rating' && (sortOrder === 'desc' ? '↓' : '↑')}
                                        </th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map(lead => (
                                        <tr key={lead.id} onClick={() => setSelectedLead(lead)}>
                                            <td onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    checked={selectedIds.has(lead.id)}
                                                    onChange={() => toggleSelect(lead.id)}
                                                />
                                            </td>
                                            <td>
                                                <div className={`score-badge ${getScoreClass(lead.score)}`}>
                                                    {lead.score}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{lead.displayName}</div>
                                                <div className="text-xs text-muted truncate" style={{ maxWidth: 250 }}>
                                                    {lead.formattedAddress || 'No address'}
                                                </div>
                                                <div className="flex gap-sm" style={{ marginTop: 4 }}>
                                                    {lead.niche && <span className="tag">{lead.niche}</span>}
                                                    {!lead.websiteUri && <span className="tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.65rem' }}>No website</span>}
                                                </div>
                                            </td>
                                            <td>
                                                {lead.nationalPhone && <div className="text-sm">{lead.nationalPhone}</div>}
                                                {lead.websiteDomain && (
                                                    <div className="text-xs text-accent">{lead.websiteDomain}</div>
                                                )}
                                                {lead.emails.length > 0 && (
                                                    <div className="text-xs text-muted">{lead.emails[0].email}</div>
                                                )}
                                            </td>
                                            <td>
                                                {lead.rating ? (
                                                    <div>
                                                        <span style={{ color: 'var(--warning)' }}>★</span> {lead.rating}
                                                        <div className="text-xs text-muted">{lead.userRatingCount} reviews</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">—</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={getStatusBadge(lead.status)}>
                                                    {lead.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <div className="flex gap-sm">
                                                    {lead.nationalPhone && (
                                                        <a
                                                            href={getWaUrl(lead.nationalPhone)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-ghost btn-sm"
                                                            style={{
                                                                padding: '4px 8px',
                                                                color: '#25D366',
                                                                fontSize: '1rem',
                                                            }}
                                                            title="Open WhatsApp"
                                                        >
                                                            📱
                                                        </a>
                                                    )}
                                                    {lead.emails.length > 0 && (
                                                        <a
                                                            href={`mailto:${lead.emails[0].email}`}
                                                            className="btn btn-ghost btn-sm"
                                                            style={{
                                                                padding: '4px 8px',
                                                                color: '#3b82f6',
                                                                fontSize: '1rem',
                                                            }}
                                                            title="Send email"
                                                        >
                                                            📧
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex gap-sm">
                                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                    ← Previous
                                </button>
                                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Lead Detail Modal */}
                {selectedLead && (
                    <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
                        <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedLead.displayName}</h3>
                                    <div className="text-sm text-muted">{selectedLead.formattedAddress}</div>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLead(null)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="flex flex-col gap-lg">
                                    {/* Score Section */}
                                    <div className="flex items-center gap-lg">
                                        <div className={`score-badge ${getScoreClass(selectedLead.score)}`} style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
                                            {selectedLead.score}
                                        </div>
                                        <div>
                                            <div className="text-sm" style={{ fontWeight: 600 }}>Lead Score</div>
                                            <span className={getStatusBadge(selectedLead.status)}>
                                                {selectedLead.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                        {selectedLead.nationalPhone && (
                                            <a
                                                href={getWaUrl(selectedLead.nationalPhone)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-sm"
                                                style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}
                                            >
                                                📱 WhatsApp
                                            </a>
                                        )}
                                        {selectedLead.nationalPhone && (
                                            <a
                                                href={`tel:${selectedLead.nationalPhone}`}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                📞 Call
                                            </a>
                                        )}
                                        {selectedLead.emails.length > 0 && (
                                            <a
                                                href={`mailto:${selectedLead.emails[0].email}`}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                📧 Email
                                            </a>
                                        )}
                                        {selectedLead.websiteUri && (
                                            <a
                                                href={selectedLead.websiteUri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary btn-sm"
                                            >
                                                🌐 Website
                                            </a>
                                        )}
                                    </div>

                                    {/* Why this score? */}
                                    {selectedLead.topReasons.length > 0 && (
                                        <div>
                                            <div className="card-title mb-lg" style={{ marginBottom: 8 }}>Why this score?</div>
                                            <div className="score-reasons">
                                                {selectedLead.topReasons.map((reason, i) => (
                                                    <div key={i} className="score-reason">{reason}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact Info */}
                                    <div className="grid-2" style={{ gap: 'var(--space-md)' }}>
                                        <div className="form-group">
                                            <div className="form-label">Phone</div>
                                            <div className="text-sm">{selectedLead.nationalPhone || '—'}</div>
                                        </div>
                                        <div className="form-group">
                                            <div className="form-label">Website</div>
                                            <div className="text-sm">
                                                {selectedLead.websiteUri ? (
                                                    <a href={selectedLead.websiteUri} target="_blank" rel="noopener noreferrer">
                                                        {selectedLead.websiteDomain}
                                                    </a>
                                                ) : <span style={{ color: '#ef4444' }}>No website</span>}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <div className="form-label">Rating</div>
                                            <div className="text-sm">
                                                {selectedLead.rating ? `${selectedLead.rating}★ (${selectedLead.userRatingCount} reviews)` : '—'}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <div className="form-label">Niche</div>
                                            <div className="text-sm">{selectedLead.niche || '—'}</div>
                                        </div>
                                    </div>

                                    {/* Emails */}
                                    {selectedLead.emails.length > 0 && (
                                        <div>
                                            <div className="card-title" style={{ marginBottom: 8 }}>Emails</div>
                                            <div className="flex flex-col gap-sm">
                                                {selectedLead.emails.map(email => (
                                                    <div key={email.id} style={{
                                                        padding: 'var(--space-sm) var(--space-md)',
                                                        background: 'var(--bg-tertiary)',
                                                        borderRadius: 'var(--radius-md)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    }}>
                                                        <span className="text-sm">{email.email}</span>
                                                        <div className="flex gap-sm items-center">
                                                            {email.isGeneric && <span className="tag">generic</span>}
                                                            <span className={`badge ${email.confidence === 'HIGH' ? 'badge-ready' : 'badge-queued'}`}>
                                                                {email.confidence}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tags */}
                                    {selectedLead.tags.length > 0 && (
                                        <div>
                                            <div className="card-title" style={{ marginBottom: 8 }}>Tags</div>
                                            <div className="flex gap-sm">
                                                {selectedLead.tags.map(tag => (
                                                    <span key={tag} className="tag">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Link href={`/leads/${selectedLead.id}`} className="btn btn-secondary btn-sm">
                                    View Full Details
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mass WhatsApp Modal */}
                {showMassWa && (
                    <div className="modal-overlay" onClick={() => setShowMassWa(false)}>
                        <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="flex items-center gap-sm">
                                    <h3 style={{ fontWeight: 700 }}>📱 Mass WhatsApp</h3>
                                    <span className="tag" style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }}>
                                        {selectedLeadsWithPhone.length} contacts
                                    </span>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowMassWa(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="flex flex-col gap-lg">
                                    {/* Message Template */}
                                    <div className="form-group">
                                        <label className="form-label">Message (optional pre-fill)</label>
                                        <textarea
                                            ref={waMessageRef}
                                            className="form-textarea"
                                            value={waMessage}
                                            onChange={e => setWaMessage(e.target.value)}
                                            style={{ minHeight: 100, fontSize: '0.9rem' }}
                                            placeholder="Write your message... Use {company_name} for personalization"
                                        />
                                        <div className="flex gap-sm" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                                            {['{company_name}', '{city}', '{niche}'].map(v => (
                                                <button
                                                    key={v}
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '2px 8px' }}
                                                    onClick={() => {
                                                        if (waMessageRef.current) {
                                                            const ta = waMessageRef.current;
                                                            const start = ta.selectionStart;
                                                            const end = ta.selectionEnd;
                                                            const newMsg = waMessage.substring(0, start) + v + waMessage.substring(end);
                                                            setWaMessage(newMsg);
                                                            setTimeout(() => {
                                                                ta.focus();
                                                                ta.setSelectionRange(start + v.length, start + v.length);
                                                            }, 0);
                                                        }
                                                    }}
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Contact List */}
                                    <div className="flex flex-col gap-sm" style={{ maxHeight: 350, overflowY: 'auto' }}>
                                        {selectedLeadsWithPhone.map(lead => {
                                            // Render variables in the message
                                            const personalizedMsg = waMessage
                                                .replace(/\{company_name\}/g, lead.displayName)
                                                .replace(/\{city\}/g, lead.formattedAddress?.split(',').pop()?.trim() || '')
                                                .replace(/\{niche\}/g, lead.niche || '');
                                            const url = getWaUrl(lead.nationalPhone!, personalizedMsg);
                                            const opened = waOpened.has(lead.id);

                                            return (
                                                <div key={lead.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: 'var(--space-md)',
                                                    background: opened ? 'rgba(37, 211, 102, 0.08)' : 'var(--bg-tertiary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: opened ? '1px solid rgba(37, 211, 102, 0.3)' : '1px solid var(--border-primary)',
                                                    transition: 'all 0.2s',
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{lead.displayName}</div>
                                                        <div className="text-sm text-muted">{lead.nationalPhone}</div>
                                                        {lead.niche && <span className="tag" style={{ marginTop: 2 }}>{lead.niche}</span>}
                                                    </div>
                                                    <div className="flex gap-sm items-center">
                                                        {opened ? (
                                                            <span className="badge badge-ready">✅ Opened</span>
                                                        ) : (
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn btn-sm"
                                                                style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}
                                                                onClick={() => setWaOpened(prev => {
                                                                    const next = new Set(prev);
                                                                    next.add(lead.id);
                                                                    return next;
                                                                })}
                                                            >
                                                                📱 Open
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <div className="text-sm text-muted">
                                    {waOpened.size} of {selectedLeadsWithPhone.length} opened
                                </div>
                                <button className="btn btn-ghost" onClick={() => setShowMassWa(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';

interface Template {
    id: string;
    name: string;
    subject: string;
    body: string;
    type: string;
    language: string;
    niche: string | null;
    variables: string[];
    isActive: boolean;
    createdAt: string;
}

const AVAILABLE_VARIABLES = [
    { key: 'company_name', label: 'Company Name', icon: '🏢' },
    { key: 'city', label: 'City', icon: '📍' },
    { key: 'website', label: 'Website', icon: '🌐' },
    { key: 'niche', label: 'Niche', icon: '🏷️' },
    { key: 'phone', label: 'Phone', icon: '📞' },
    { key: 'rating', label: 'Rating', icon: '⭐' },
    { key: 'review_count', label: 'Reviews', icon: '💬' },
    { key: 'first_name', label: 'First Name', icon: '👤' },
];

const DEFAULT_TEMPLATES = [
    {
        name: 'Web Development Offer',
        type: 'email' as const,
        subject: 'A better website for {company_name}?',
        body: `<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
  <p>Hi there,</p>

  <p>I came across <strong>{company_name}</strong> in {city} and was impressed by your business. However, I noticed there might be an opportunity to improve your online presence.</p>

  <p>At our agency, we specialize in creating modern, fast, and mobile-friendly websites that help businesses like yours:</p>

  <ul>
    <li>Attract more customers through search engines</li>
    <li>Look professional and trustworthy online</li>
    <li>Convert visitors into paying clients</li>
  </ul>

  <p>Would you be open to a quick chat about how we could help {company_name} grow online?</p>

  <p>Best regards,<br/>Your Name</p>
</div>`,
        niche: '',
    },
    {
        name: 'No Website Detected',
        type: 'email' as const,
        subject: '{company_name} — your customers are looking for you online',
        body: `<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
  <p>Hi,</p>

  <p>I was looking for <strong>{company_name}</strong> online and noticed you don't seem to have a website yet.</p>

  <p>Did you know that 97% of consumers search online for local businesses? Without a website, you could be missing out on a significant number of potential customers.</p>

  <p>We help businesses in {city} get online quickly with:</p>

  <ul>
    <li>A professional, custom-designed website</li>
    <li>Mobile-responsive design</li>
    <li>Google Maps and SEO optimization</li>
    <li>Easy-to-manage content</li>
  </ul>

  <p>Would you like to see some examples of what we've built for other {niche} businesses?</p>

  <p>Best,<br/>Your Name</p>
</div>`,
        niche: '',
    },
    {
        name: 'WhatsApp — Website Offer',
        type: 'whatsapp' as const,
        subject: 'Website offer for {company_name}',
        body: `Hi! 👋

I came across *{company_name}* in {city} and was really impressed by your business.

I noticed you might benefit from a modern website to attract more customers online. We specialize in creating fast, mobile-friendly websites for {niche} businesses.

Would you be open to a quick chat about how we could help {company_name} grow online? 🚀

Looking forward to hearing from you!`,
        niche: '',
    },
    {
        name: 'WhatsApp — No Website',
        type: 'whatsapp' as const,
        subject: 'Online presence for {company_name}',
        body: `Hi! 👋

I was looking for *{company_name}* online and noticed you don't have a website yet.

Did you know that 97% of customers search online before visiting a local business? A website could help you:
✅ Get found on Google
✅ Look professional and trustworthy
✅ Convert visitors into paying customers

We've helped many {niche} businesses in {city} get online quickly. Would you like to see some examples?

Best regards! 😊`,
        niche: '',
    },
];

/* ─── Formatting Toolbar SVG Icons ──────────────────────────── */
const toolbarIcons = {
    bold: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>,
    italic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="10" y1="4" y2="4" /><line x1="14" x2="5" y1="20" y2="20" /><line x1="15" x2="9" y1="4" y2="20" /></svg>,
    underline: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" x2="20" y1="20" y2="20" /></svg>,
    link: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
    heading: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12h12" /><path d="M6 4v16" /><path d="M18 4v16" /></svg>,
    list: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>,
    color: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" /><path d="m5 2 5 5" /><path d="M2 13h15" /><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.8 2-4 .3 1.2 2 2.4 2 4Z" /></svg>,
};

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [tplNiche, setTplNiche] = useState('');
    const [tplType, setTplType] = useState<'email' | 'whatsapp'>('email');
    const [tplLang, setTplLang] = useState<'fr' | 'en'>('fr');
    const [langFilter, setLangFilter] = useState<'' | 'fr' | 'en'>('');
    const [seeding, setSeeding] = useState(false);
    const [previewVars, setPreviewVars] = useState<Record<string, string>>({
        company_name: 'Acme Electric',
        city: 'Brussels',
        website: 'www.example.com',
        niche: 'electricians',
        phone: '+32 2 123 4567',
        rating: '4.5',
        review_count: '127',
        first_name: 'John',
    });
    const [showPreview, setShowPreview] = useState(false);
    const [previewBody, setPreviewBody] = useState('');
    const [previewSubject, setPreviewSubject] = useState('');
    const [previewType, setPreviewType] = useState<'email' | 'whatsapp'>('email');
    const [activeVarTarget, setActiveVarTarget] = useState<'subject' | 'body'>('body');
    const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const subjectRef = useRef<HTMLInputElement>(null);

    const fetchTemplates = useCallback(async () => {
        try {
            const res = await fetch('/api/templates');
            const data = await res.json();
            setTemplates(data.templates || []);
        } catch (err) {
            console.error('Failed to load templates:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const resetForm = () => {
        setName('');
        setSubject('');
        setBody('');
        setTplNiche('');
        setTplType('email');
        setTplLang('fr');
        setEditingId(null);
        setEditorTab('write');
    };

    const openCreate = () => {
        resetForm();
        setShowEditor(true);
    };

    const openEdit = (tpl: Template) => {
        setEditingId(tpl.id);
        setName(tpl.name);
        setSubject(tpl.subject);
        setBody(tpl.body);
        setTplNiche(tpl.niche || '');
        setTplType(tpl.type as 'email' | 'whatsapp');
        setTplLang((tpl.language as 'fr' | 'en') || 'fr');
        setEditorTab('write');
        setShowEditor(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...(editingId ? { id: editingId } : {}),
                name,
                subject,
                body,
                niche: tplNiche || null,
                type: tplType,
                language: tplLang,
            };

            const res = await fetch('/api/templates', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setShowEditor(false);
                resetForm();
                fetchTemplates();
            }
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteConfirm(null);
                fetchTemplates();
            }
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const loadPreset = (preset: typeof DEFAULT_TEMPLATES[0]) => {
        setName(preset.name);
        setSubject(preset.subject);
        setBody(preset.body);
        setTplNiche(preset.niche);
        setTplType(preset.type);
        setEditingId(null);
        setShowEditor(true);
    };

    const renderPreview = (text: string) => {
        let rendered = text;
        for (const [key, value] of Object.entries(previewVars)) {
            rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return rendered;
    };

    const insertVariable = (varKey: string) => {
        const varText = `{${varKey}}`;
        if (activeVarTarget === 'body' && bodyRef.current) {
            const textarea = bodyRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newBody = body.substring(0, start) + varText + body.substring(end);
            setBody(newBody);
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + varText.length, start + varText.length);
            }, 0);
        } else if (activeVarTarget === 'subject' && subjectRef.current) {
            const input = subjectRef.current;
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const newSubject = subject.substring(0, start) + varText + subject.substring(end);
            setSubject(newSubject);
            setTimeout(() => {
                input.focus();
                input.setSelectionRange(start + varText.length, start + varText.length);
            }, 0);
        }
    };

    /* ─── Rich Formatting Helpers ──────────────────────────────── */
    const wrapSelection = (before: string, after: string) => {
        if (!bodyRef.current) return;
        const textarea = bodyRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = body.substring(start, end) || 'text';
        const newBody = body.substring(0, start) + before + selected + after + body.substring(end);
        setBody(newBody);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
        }, 0);
    };

    const formatBold = () => wrapSelection('<strong>', '</strong>');
    const formatItalic = () => wrapSelection('<em>', '</em>');
    const formatUnderline = () => wrapSelection('<u>', '</u>');
    const formatHeading = () => wrapSelection('<h3>', '</h3>');
    const formatList = () => {
        if (!bodyRef.current) return;
        const textarea = bodyRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = body.substring(start, end) || 'Item 1\nItem 2\nItem 3';
        const items = selected.split('\n').map(line => `  <li>${line.trim()}</li>`).join('\n');
        const replacement = `<ul>\n${items}\n</ul>`;
        const newBody = body.substring(0, start) + replacement + body.substring(end);
        setBody(newBody);
        setTimeout(() => { textarea.focus(); }, 0);
    };
    const formatLink = () => {
        const url = prompt('Enter URL:');
        if (url) wrapSelection(`<a href="${url}">`, '</a>');
    };
    const formatColor = () => {
        const color = prompt('Enter color (hex or name):', '#6366f1');
        if (color) wrapSelection(`<span style="color: ${color}">`, '</span>');
    };

    const toolbarActions = [
        { icon: toolbarIcons.bold, label: 'Bold', action: formatBold },
        { icon: toolbarIcons.italic, label: 'Italic', action: formatItalic },
        { icon: toolbarIcons.underline, label: 'Underline', action: formatUnderline },
        { icon: toolbarIcons.heading, label: 'Heading', action: formatHeading },
        { icon: toolbarIcons.list, label: 'List', action: formatList },
        { icon: toolbarIcons.link, label: 'Link', action: formatLink },
        { icon: toolbarIcons.color, label: 'Color', action: formatColor },
    ];

    return (
        <Sidebar>
            <div className="page-header">
                <div>
                    <h2>Templates</h2>
                    <div className="page-subtitle">Create and manage reusable email & WhatsApp templates</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={openCreate}>
                    + New Template
                </button>
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                        setSeeding(true);
                        try {
                            const res = await fetch('/api/templates/seed', { method: 'POST' });
                            const data = await res.json();
                            alert(`Seeded ${data.created} new, updated ${data.updated} templates`);
                            fetchTemplates();
                        } catch { alert('Seed failed'); }
                        setSeeding(false);
                    }}
                    disabled={seeding}
                >
                    {seeding ? '⏳' : '🌱'} Seed Templates
                </button>
            </div>

            <div className="page-body">
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner spinner-lg"></div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-lg animate-in">
                        {/* Language Filter Tabs */}
                        <div className="tabs">
                            {[
                                { key: '', label: 'All', icon: '🌍' },
                                { key: 'fr', label: 'Français', icon: '🇫🇷' },
                                { key: 'en', label: 'English', icon: '🇬🇧' },
                            ].map(t => (
                                <button
                                    key={t.key}
                                    className={`tab ${langFilter === t.key ? 'active' : ''}`}
                                    onClick={() => setLangFilter(t.key as '' | 'fr' | 'en')}
                                >
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>
                        {/* Quick Start Templates */}
                        {templates.length === 0 && (
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">🚀 Quick Start</div>
                                </div>
                                <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                                    Start with one of these pre-built templates:
                                </div>
                                <div className="flex flex-col gap-md">
                                    {DEFAULT_TEMPLATES.map((preset, i) => (
                                        <div key={i} style={{
                                            padding: 'var(--space-md)',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            border: '1px solid var(--border-primary)',
                                            gap: 'var(--space-md)',
                                            flexWrap: 'wrap',
                                        }} onClick={() => loadPreset(preset)}>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div className="flex items-center gap-sm">
                                                    <span style={{ fontSize: '1.1rem' }}>{preset.type === 'whatsapp' ? '📱' : '📧'}</span>
                                                    <div style={{ fontWeight: 600 }}>{preset.name}</div>
                                                </div>
                                                <div className="text-sm text-muted truncate">{preset.subject}</div>
                                            </div>
                                            <div className="flex items-center gap-sm" style={{ flexShrink: 0 }}>
                                                <span className="tag" style={{
                                                    background: preset.type === 'whatsapp' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                    color: preset.type === 'whatsapp' ? '#25D366' : '#3b82f6',
                                                }}>{preset.type === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                                                <button className="btn btn-secondary btn-sm">Use</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Variable Reference */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">📌 Available Variables</div>
                            </div>
                            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                {AVAILABLE_VARIABLES.map(v => (
                                    <span key={v.key} className="tag font-mono">{v.icon} {`{${v.key}}`}</span>
                                ))}
                            </div>
                        </div>

                        {/* Template List */}
                        {templates.filter(tpl => !langFilter || tpl.language === langFilter).length > 0 && (
                            <div className="flex flex-col gap-md">
                                {templates.filter(tpl => !langFilter || tpl.language === langFilter).map(tpl => (
                                    <div key={tpl.id} className="card" style={{ position: 'relative' }}>
                                        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div className="flex items-center gap-sm" style={{ flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '1.1rem' }}>{tpl.type === 'whatsapp' ? '📱' : '📧'}</span>
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{tpl.name}</h3>
                                                    <span className="tag" style={{
                                                        background: tpl.type === 'whatsapp' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                        color: tpl.type === 'whatsapp' ? '#25D366' : '#3b82f6',
                                                        fontSize: '0.7rem',
                                                    }}>{tpl.type === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                                                    <span className="tag" style={{ fontSize: '0.7rem' }}>{tpl.language === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}</span>
                                                </div>
                                                <div className="text-sm text-muted truncate">Subject: {tpl.subject}</div>
                                                <div className="flex gap-sm mt-md" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                                                    {tpl.niche && <span className="tag">{tpl.niche}</span>}
                                                    {tpl.variables.map(v => (
                                                        <span key={v} className="tag font-mono text-xs">{`{${v}}`}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-sm" style={{ flexShrink: 0 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => {
                                                    setPreviewBody(tpl.body);
                                                    setPreviewSubject(tpl.subject);
                                                    setPreviewType(tpl.type as 'email' | 'whatsapp');
                                                    setShowPreview(true);
                                                }}>
                                                    👁 Preview
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(tpl)}>
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => setDeleteConfirm(tpl.id)}
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        </div>

                                        {/* Delete confirmation inline */}
                                        {deleteConfirm === tpl.id && (
                                            <div style={{
                                                marginTop: 'var(--space-md)',
                                                padding: 'var(--space-md)',
                                                background: 'var(--danger-bg)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                            }}>
                                                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                                    <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                                                        Delete &quot;{tpl.name}&quot;? This cannot be undone.
                                                    </span>
                                                    <div className="flex gap-sm">
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tpl.id)}>Delete</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Editor Modal (Create / Edit) */}
                {showEditor && (
                    <div className="modal-overlay" onClick={() => { setShowEditor(false); resetForm(); }}>
                        <div className="modal" style={{ maxWidth: 900, width: '95%' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 style={{ fontWeight: 700 }}>{editingId ? 'Edit Template' : 'Create Template'}</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setShowEditor(false); resetForm(); }}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="flex flex-col gap-lg">
                                    {/* Template Type Toggle */}
                                    <div className="form-group">
                                        <label className="form-label">Template Type</label>
                                        <div className="flex gap-sm">
                                            <button
                                                className={`btn ${tplType === 'email' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                                onClick={() => setTplType('email')}
                                                style={{ flex: 1 }}
                                            >
                                                📧 Email
                                            </button>
                                            <button
                                                className={`btn ${tplType === 'whatsapp' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                                onClick={() => setTplType('whatsapp')}
                                                style={{
                                                    flex: 1,
                                                    ...(tplType === 'whatsapp' ? {
                                                        background: '#25D366',
                                                        borderColor: '#25D366',
                                                    } : {}),
                                                }}
                                            >
                                                📱 WhatsApp
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Template Name</label>
                                            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website Offer" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Niche (optional)</label>
                                            <input className="form-input" value={tplNiche} onChange={e => setTplNiche(e.target.value)} placeholder="e.g. restaurants" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Subject Line</label>
                                        <input
                                            ref={subjectRef}
                                            className="form-input"
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                            onFocus={() => setActiveVarTarget('subject')}
                                            placeholder="e.g. A better website for {company_name}?"
                                        />
                                    </div>

                                    {/* Variable Insertion Buttons */}
                                    <div className="form-group">
                                        <label className="form-label" style={{ marginBottom: 6 }}>
                                            Insert Variable →
                                            <span className="text-xs text-muted" style={{ marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>
                                                Click to insert into {activeVarTarget === 'subject' ? 'subject' : 'body'}
                                            </span>
                                        </label>
                                        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                            {AVAILABLE_VARIABLES.map(v => (
                                                <button
                                                    key={v.key}
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => insertVariable(v.key)}
                                                    style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: '0.78rem',
                                                        padding: '4px 10px',
                                                        border: '1px solid var(--border-primary)',
                                                        borderRadius: 'var(--radius-md)',
                                                    }}
                                                    title={`Insert {${v.key}}`}
                                                >
                                                    {v.icon} {`{${v.key}}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Body Editor with Toolbar */}
                                    <div className="form-group">
                                        <label className="form-label">
                                            {tplType === 'whatsapp' ? 'Message Body (plain text)' : 'Body (HTML)'}
                                        </label>

                                        {/* Rich formatting toolbar (email only) */}
                                        {tplType === 'email' && (
                                            <div style={{
                                                display: 'flex',
                                                gap: 'var(--space-xs)',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                marginBottom: 'var(--space-sm)',
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    gap: 2,
                                                    background: 'var(--bg-tertiary)',
                                                    padding: '4px',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border-primary)',
                                                }}>
                                                    {toolbarActions.map(({ icon, label, action }) => (
                                                        <button
                                                            key={label}
                                                            type="button"
                                                            onClick={action}
                                                            title={label}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--text-secondary)',
                                                                cursor: 'pointer',
                                                                padding: '6px 8px',
                                                                borderRadius: 'var(--radius-sm)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                transition: 'all 0.15s',
                                                            }}
                                                            onMouseOver={e => {
                                                                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
                                                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                                                            }}
                                                            onMouseOut={e => {
                                                                (e.currentTarget as HTMLButtonElement).style.background = 'none';
                                                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                                                            }}
                                                        >
                                                            {icon}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div style={{ marginLeft: 'auto' }}>
                                                    <div className="flex gap-sm">
                                                        <button
                                                            className={`btn btn-sm ${editorTab === 'write' ? 'btn-secondary' : 'btn-ghost'}`}
                                                            onClick={() => setEditorTab('write')}
                                                            style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                                        >
                                                            Code
                                                        </button>
                                                        <button
                                                            className={`btn btn-sm ${editorTab === 'preview' ? 'btn-secondary' : 'btn-ghost'}`}
                                                            onClick={() => setEditorTab('preview')}
                                                            style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                                        >
                                                            Preview
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {(editorTab === 'write' || tplType === 'whatsapp') ? (
                                            <textarea
                                                ref={bodyRef}
                                                className="form-textarea"
                                                value={body}
                                                onChange={e => setBody(e.target.value)}
                                                onFocus={() => setActiveVarTarget('body')}
                                                style={{ minHeight: 280, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                                                placeholder={tplType === 'whatsapp'
                                                    ? 'Write your WhatsApp message here... Use *bold* and _italic_ for formatting.'
                                                    : 'Write your HTML email body here...'
                                                }
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    minHeight: 280,
                                                    padding: 'var(--space-lg)',
                                                    background: '#fff',
                                                    borderRadius: 'var(--radius-md)',
                                                    color: '#333',
                                                    border: '1px solid var(--border-primary)',
                                                    overflow: 'auto',
                                                }}
                                                dangerouslySetInnerHTML={{ __html: renderPreview(body) }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => { setShowEditor(false); resetForm(); }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSave} disabled={!name || !subject || !body || saving}>
                                    {saving ? 'Saving...' : (editingId ? 'Update Template' : 'Save Template')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Modal */}
                {showPreview && (
                    <div className="modal-overlay" onClick={() => setShowPreview(false)}>
                        <div className="modal" style={{ maxWidth: 700, width: '95%' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="flex items-center gap-sm">
                                    <h3 style={{ fontWeight: 700 }}>Template Preview</h3>
                                    <span className="tag" style={{
                                        background: previewType === 'whatsapp' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                        color: previewType === 'whatsapp' ? '#25D366' : '#3b82f6',
                                    }}>{previewType === 'whatsapp' ? '📱 WhatsApp' : '📧 Email'}</span>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="flex flex-col gap-lg">
                                    <div className="form-group">
                                        <label className="form-label">Preview Variables</label>
                                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                            {Object.entries(previewVars).map(([key, value]) => (
                                                <input
                                                    key={key}
                                                    className="form-input"
                                                    placeholder={key}
                                                    value={value}
                                                    onChange={e => setPreviewVars(prev => ({ ...prev, [key]: e.target.value }))}
                                                    style={{ fontSize: '0.82rem' }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="form-label" style={{ marginBottom: 8 }}>Subject</div>
                                        <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                            {renderPreview(previewSubject)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="form-label" style={{ marginBottom: 8 }}>
                                            {previewType === 'whatsapp' ? 'Message' : 'Body'}
                                        </div>
                                        {previewType === 'whatsapp' ? (
                                            <div style={{
                                                padding: 'var(--space-lg)',
                                                background: '#e5ddd5',
                                                borderRadius: 'var(--radius-md)',
                                            }}>
                                                <div style={{
                                                    background: '#dcf8c6',
                                                    padding: 'var(--space-md)',
                                                    borderRadius: '8px',
                                                    maxWidth: '80%',
                                                    marginLeft: 'auto',
                                                    color: '#333',
                                                    fontSize: '0.9rem',
                                                    lineHeight: 1.5,
                                                    whiteSpace: 'pre-wrap',
                                                }}>
                                                    {renderPreview(previewBody)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    padding: 'var(--space-lg)',
                                                    background: '#fff',
                                                    borderRadius: 'var(--radius-md)',
                                                    color: '#333',
                                                }}
                                                dangerouslySetInnerHTML={{ __html: renderPreview(previewBody) }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowPreview(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}

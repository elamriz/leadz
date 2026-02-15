'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';

interface Template {
    id: string;
    name: string;
    subject: string;
    body: string;
    type: string;
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

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Form
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [tplNiche, setTplNiche] = useState('');
    const [tplType, setTplType] = useState<'email' | 'whatsapp'>('email');
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

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    subject,
                    body,
                    niche: tplNiche || null,
                    type: tplType,
                }),
            });
            if (res.ok) {
                setShowCreate(false);
                setName('');
                setSubject('');
                setBody('');
                setTplNiche('');
                setTplType('email');
                fetchTemplates();
            }
        } catch (err) {
            console.error('Failed to create:', err);
        }
    };

    const loadPreset = (preset: typeof DEFAULT_TEMPLATES[0]) => {
        setName(preset.name);
        setSubject(preset.subject);
        setBody(preset.body);
        setTplNiche(preset.niche);
        setTplType(preset.type);
        setShowCreate(true);
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
            // Restore cursor position after React re-render
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

    return (
        <Sidebar>
            <div className="page-header">
                <div>
                    <h2>Templates</h2>
                    <div className="page-subtitle">Create and manage reusable email & WhatsApp templates</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                    + New Template
                </button>
            </div>

            <div className="page-body">
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner spinner-lg"></div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-lg animate-in">
                        {/* Quick Start Templates */}
                        {templates.length === 0 && (
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">🚀 Quick Start</div>
                                </div>
                                <div className="text-sm text-muted mb-lg" style={{ marginBottom: 'var(--space-md)' }}>
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
                                        }} onClick={() => loadPreset(preset)}>
                                            <div>
                                                <div className="flex items-center gap-sm">
                                                    <span style={{ fontSize: '1.1rem' }}>{preset.type === 'whatsapp' ? '📱' : '📧'}</span>
                                                    <div style={{ fontWeight: 600 }}>{preset.name}</div>
                                                </div>
                                                <div className="text-sm text-muted">{preset.subject}</div>
                                            </div>
                                            <div className="flex items-center gap-sm">
                                                <span className={`tag ${preset.type === 'whatsapp' ? '' : ''}`} style={{
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
                        {templates.length > 0 && (
                            <div className="flex flex-col gap-md">
                                {templates.map(tpl => (
                                    <div key={tpl.id} className="card">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-sm">
                                                    <span style={{ fontSize: '1.1rem' }}>{tpl.type === 'whatsapp' ? '📱' : '📧'}</span>
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{tpl.name}</h3>
                                                    <span className="tag" style={{
                                                        background: tpl.type === 'whatsapp' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                        color: tpl.type === 'whatsapp' ? '#25D366' : '#3b82f6',
                                                        fontSize: '0.7rem',
                                                    }}>{tpl.type === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                                                </div>
                                                <div className="text-sm text-muted">Subject: {tpl.subject}</div>
                                                <div className="flex gap-sm mt-md" style={{ marginTop: 8 }}>
                                                    {tpl.niche && <span className="tag">{tpl.niche}</span>}
                                                    {tpl.variables.map(v => (
                                                        <span key={v} className="tag font-mono text-xs">{`{${v}}`}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-sm">
                                                <button className="btn btn-ghost btn-sm" onClick={() => {
                                                    setPreviewBody(tpl.body);
                                                    setPreviewSubject(tpl.subject);
                                                    setPreviewType(tpl.type as 'email' | 'whatsapp');
                                                    setShowPreview(true);
                                                }}>
                                                    👁 Preview
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Create Template Modal */}
                {showCreate && (
                    <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                        <div className="modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 style={{ fontWeight: 700 }}>Create Template</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
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
                                            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Niche (optional)</label>
                                            <input className="form-input" value={tplNiche} onChange={e => setTplNiche(e.target.value)} />
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
                                        />
                                    </div>

                                    {/* Variable Insertion Buttons */}
                                    <div className="form-group">
                                        <label className="form-label" style={{ marginBottom: 6 }}>
                                            Insert Variable →
                                            <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
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
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    title={`Insert {${v.key}}`}
                                                >
                                                    {v.icon} {`{${v.key}}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            {tplType === 'whatsapp' ? 'Message Body (plain text)' : 'Body (HTML)'}
                                        </label>
                                        <textarea
                                            ref={bodyRef}
                                            className="form-textarea"
                                            value={body}
                                            onChange={e => setBody(e.target.value)}
                                            onFocus={() => setActiveVarTarget('body')}
                                            style={{ minHeight: 250, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                                            placeholder={tplType === 'whatsapp'
                                                ? 'Write your WhatsApp message here... Use *bold* and _italic_ for formatting.'
                                                : 'Write your HTML email body here...'
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleCreate} disabled={!name || !subject || !body}>
                                    Save Template
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Modal */}
                {showPreview && (
                    <div className="modal-overlay" onClick={() => setShowPreview(false)}>
                        <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
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

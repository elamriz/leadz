'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';

/* ─── SVG Icons (Lucide-style) ───────────────────────────────── */
const icons: Record<string, ReactNode> = {
    overview: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    search: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
    ),
    leads: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    campaigns: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 11 18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
    ),
    templates: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 13H8" /><path d="M16 17H8" /><path d="M16 13h-2" />
        </svg>
    ),
    settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    sun: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
        </svg>
    ),
    moon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
    ),
    menu: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
        </svg>
    ),
    close: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
    ),
};

const iconMap: Record<string, string> = {
    Overview: 'overview',
    Search: 'search',
    Leads: 'leads',
    Campaigns: 'campaigns',
    Templates: 'templates',
    Settings: 'settings',
};

const navItems = [
    { label: 'Overview', href: '/' },
    { separator: true, label: 'Prospecting' },
    { label: 'Search', href: '/search' },
    { label: 'Leads', href: '/leads' },
    { separator: true, label: 'Outreach' },
    { label: 'Campaigns', href: '/campaigns' },
    { label: 'Templates', href: '/templates' },
    { separator: true, label: 'System' },
    { label: 'Settings', href: '/settings' },
];

export default function Sidebar({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    // Load saved theme on mount
    useEffect(() => {
        const saved = localStorage.getItem('leadforge-theme') as 'dark' | 'light' | null;
        const pref = saved || 'dark';
        setTheme(pref);
        document.documentElement.setAttribute('data-theme', pref);
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('leadforge-theme', next);
        document.documentElement.setAttribute('data-theme', next);
    };

    // Auto-close sidebar on navigation (mobile)
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    return (
        <div className="app-layout">
            {/* Mobile header */}
            <header className="mobile-header">
                <button className="mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                    {icons.menu}
                </button>
                <div className="mobile-logo">
                    <span className="logo-icon" style={{ width: 28, height: 28, fontSize: '0.85rem' }}>⚡</span>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LeadForge</span>
                </div>
                <button className="mobile-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                    {theme === 'dark' ? icons.sun : icons.moon}
                </button>
            </header>

            {/* Overlay backdrop (mobile) */}
            {mobileOpen && (
                <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
            )}

            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="logo-icon">⚡</div>
                    <h1>LeadForge</h1>
                    <button
                        className="sidebar-close"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                    >
                        {icons.close}
                    </button>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map((item, i) => {
                        if ('separator' in item && item.separator) {
                            return (
                                <div key={i} className="nav-section-label">
                                    {item.label}
                                </div>
                            );
                        }
                        const href = item.href || '/';
                        const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href));
                        const iconKey = iconMap[item.label] || 'overview';
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{icons[iconKey]}</span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer with theme toggle */}
                <div className="sidebar-footer">
                    <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                        {theme === 'dark' ? icons.sun : icons.moon}
                        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
                        LeadForge v1.0
                    </div>
                </div>
            </aside>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}

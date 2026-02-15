'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const navItems = [
    { label: 'Overview', href: '/', icon: '📊' },
    { separator: true, label: 'Prospecting' },
    { label: 'Search', href: '/search', icon: '🔍' },
    { label: 'Leads', href: '/leads', icon: '👥' },
    { separator: true, label: 'Outreach' },
    { label: 'Campaigns', href: '/campaigns', icon: '📣' },
    { label: 'Templates', href: '/templates', icon: '📝' },
    { separator: true, label: 'System' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">⚡</div>
                    <h1>LeadForge</h1>
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
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--border-primary)' }}>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)' }}>
                        LeadForge v1.0 MVP
                    </div>
                </div>
            </aside>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Send, Users, Search, Settings, FileText } from 'lucide-react';

const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Campaigns', href: '/campaigns', icon: Send },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Templates', href: '/templates', icon: FileText },
];

export default function Navigation() {
    const pathname = usePathname();

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-[var(--bg-card)] border-r border-[rgba(255,255,255,0.05)] z-50">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="LeadForge" className="w-8 h-8 object-contain" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--secondary))]">
                            LeadForge
                        </span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))]'
                                    : 'text-[rgb(var(--text-secondary))] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                    }`}
                            >
                                <item.icon
                                    size={20}
                                    className={`${isActive ? 'text-[rgb(var(--primary))]' : 'text-[rgb(var(--text-muted))] group-hover:text-white'
                                        }`}
                                />
                                <span className="font-medium">{item.name}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[rgb(var(--primary))] shadow-[0_0_8px_rgb(var(--primary))]"></div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[rgba(255,255,255,0.05)]">
                    <Link
                        href="/settings"
                        className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all ${pathname === '/settings'
                                ? 'bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))]'
                                : 'text-[rgb(var(--text-secondary))] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                            }`}
                    >
                        <Settings size={20} />
                        <span className="font-medium">Settings</span>
                    </Link>
                </div>
            </aside>

            {/* Mobile Bottom Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[rgba(255,255,255,0.05)] z-50 pb-safe">
                <div className="flex justify-around items-center px-2 py-3 overflow-x-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-all ${isActive ? 'text-[rgb(var(--primary))]' : 'text-[rgb(var(--text-muted))]'
                                    }`}
                            >
                                <item.icon
                                    size={24}
                                    className={`${isActive ? 'filter drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]' : ''}`}
                                />
                                <span className="text-[10px] font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                    <Link
                        href="/settings"
                        className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-all ${pathname === '/settings' ? 'text-[rgb(var(--primary))]' : 'text-[rgb(var(--text-muted))]'
                            }`}
                    >
                        <Settings size={24} />
                        <span className="text-[10px] font-medium">Settings</span>
                    </Link>
                </div>
            </nav>

            {/* Mobile Top Bar (Logo Only) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[rgba(var(--bg-dark),0.8)] backdrop-blur-md border-b border-[rgba(255,255,255,0.05)] z-40 flex items-center px-6">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="LeadForge" className="w-6 h-6 object-contain" />
                    <span className="text-lg font-bold text-white">LeadForge</span>
                </div>
            </div>
        </>
    );
}

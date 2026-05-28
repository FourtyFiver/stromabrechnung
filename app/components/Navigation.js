'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/readings', label: 'Zählerstände' },
    { href: '/billing-history', label: 'Abrechnungen' },
    { href: '/settings', label: 'Einstellungen' },
];

export default function Navigation() {
    const pathname = usePathname();

    if (pathname === '/login') {
        return null;
    }

    return (
        <header className="nav">
            <h2>⚡ StromApp</h2>
            {navItems.map(item => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-link${isActive ? ' active' : ''}`}
                    >
                        {item.label}
                    </Link>
                );
            })}
            <Link href="/api/auth/signout?callbackUrl=/login" className="nav-link nav-logout">
                Logout
            </Link>
        </header>
    );
}
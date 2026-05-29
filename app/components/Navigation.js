'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

    if (pathname === '/login') {
        return null;
    }

    return (
        <header className="nav">
            <h2>⚡ StromApp</h2>
            <Link href="/">Dashboard</Link>
            <Link href="/readings">Zählerstände</Link>
            <Link href="/billing-history">Abrechnungen</Link>
            <Link href="/settings">Einstellungen</Link>
            <Link href="/api/auth/signout?callbackUrl=/login" style={{ color: 'var(--danger)' }}>Logout</Link>
        </header>
    );
}

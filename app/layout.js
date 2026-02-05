import './globals.css';
import Link from 'next/link';
import { Toaster } from 'sonner';

export const metadata = {
    title: 'Stromabrechnung',
    description: 'Portal zur Stromverbrauchsverwaltung',
};

export default function RootLayout({ children }) {
    return (
        <html lang="de">
            <body>
                <div className="container">
                    <header className="nav glass-card">
                        <h2 style={{ margin: 0, marginRight: 'auto', fontSize: '1.25rem' }}>⚡ StromPortal</h2>
                        <Link href="/">Dashboard</Link>
                        <Link href="/readings">Zählerstände</Link>
                        <Link href="/settings">Einstellungen</Link>
                        <Link href="/api/auth/signout" style={{ color: '#ef4444' }}>Logout</Link>
                    </header>
                    <main>{children}</main>
                    <Toaster position="top-right" richColors />
                </div>
            </body>
        </html>
    );
}

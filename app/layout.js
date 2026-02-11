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
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body>
                <div className="container">
                    <header className="nav">
                        <h2>⚡ StromPortal</h2>
                        <Link href="/">Dashboard</Link>
                        <Link href="/readings">Zählerstände</Link>
                        <Link href="/billing-history">Abrechnungen</Link>
                        <Link href="/settings">Einstellungen</Link>
                        <Link href="/api/auth/signout" style={{ color: 'var(--danger)' }}>Logout</Link>
                    </header>
                    <main>{children}</main>
                    <Toaster position="top-right" richColors theme="dark" />
                </div>
            </body>
        </html>
    );
}

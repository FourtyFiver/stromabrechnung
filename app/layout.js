import './globals.css';
import Navigation from './components/Navigation';
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
                    <Navigation />
                    <main>{children}</main>
                    <Toaster position="top-right" richColors theme="dark" />
                </div>
            </body>
        </html>
    );
}

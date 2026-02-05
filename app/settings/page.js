import prisma from "@/lib/db"
import prisma from "@/lib/db"
import SettingsForm from "./SettingsForm"

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const currentPrice = await prisma.priceConfig.findFirst({
        orderBy: { validFrom: 'desc' }
    })

    return (
        <div>
            <h1>Einstellungen</h1>

            <div className="glass-card" style={{ maxWidth: '600px', marginBottom: '2rem' }}>
                <h2>Neuen Strompreis festlegen</h2>
                <SettingsForm />
            </div>

            <div className="glass-card">
                <h2>Aktuelle Preise</h2>
                {currentPrice ? (
                    <div className="stats-grid">
                        <div>
                            <div className="stat-label">HT Preis</div>
                            <div className="stat-value">{currentPrice.priceHT} €</div>
                        </div>
                        <div>
                            <div className="stat-label">NT Preis</div>
                            <div className="stat-value">{currentPrice.priceNT} €</div>
                        </div>
                        <div>
                            <div className="stat-label">Grundgebühr</div>
                            <div className="stat-value">{currentPrice.baseFee} € ({currentPrice.baseFeeSplit}%)</div>
                        </div>
                        <div>
                            <div className="stat-label">Gültig seit</div>
                            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{currentPrice.validFrom.toLocaleDateString('de-DE')}</div>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Noch keine Preise konfiguriert.</p>
                )}
            </div>
        </div>
    )
}

import prisma from "@/lib/db"
import { addPriceConfig } from "@/app/actions"

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
                <form action={addPriceConfig}>
                    <div className="input-group">
                        <label>Preis HT (€/kWh)</label>
                        <input type="number" step="0.0001" name="priceHT" className="input-field" required placeholder="0.30" />
                    </div>
                    <div className="input-group">
                        <label>Preis NT (€/kWh)</label>
                        <input type="number" step="0.0001" name="priceNT" className="input-field" required placeholder="0.20" />
                    </div>
                    <div className="input-group">
                        <label>Grundgebühr (€/Monat)</label>
                        <input type="number" step="0.0001" name="baseFee" className="input-field" placeholder="10.00" />
                    </div>
                    <button type="submit" className="btn">Speichern</button>
                </form>
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
                            <div className="stat-value">{currentPrice.baseFee} €</div>
                        </div>
                        <div>
                            <div className="stat-label">Gültig seit</div>
                            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{currentPrice.validFrom.toLocaleDateString()}</div>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Noch keine Preise konfiguriert.</p>
                )}
            </div>
        </div>
    )
}

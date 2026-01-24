import prisma from "@/lib/db"
import Link from "next/link"

async function getDashboardData() {
    const readings = await prisma.reading.findMany({
        orderBy: { date: 'asc' }, // Oldest to newest for calculation
    })

    const currentPrice = await prisma.priceConfig.findFirst({
        orderBy: { validFrom: 'desc' }
    })

    // Calculate costs between readings
    let totalCost = 0
    let lastPeriodCost = 0
    let latestReading = readings[readings.length - 1]

    // Simple calculation: just delta * current price for now (since tracking historical prices perfectly is complex without complex logic)
    // For a robust system, we would need to find the price valid at the time of the reading interval.

    if (readings.length >= 2 && currentPrice) {
        const prev = readings[readings.length - 2]
        const curr = readings[readings.length - 1]

        const deltaHT = curr.valueHT - prev.valueHT
        const deltaNT = curr.valueNT - prev.valueNT

        lastPeriodCost = (deltaHT * currentPrice.priceHT) + (deltaNT * currentPrice.priceNT)
    }

    return {
        latestReading,
        readingsCount: readings.length,
        currentPrice,
        lastPeriodCost
    }
}

export default async function Home() {
    const data = await getDashboardData()

    return (
        <div>
            <h1>Dashboard</h1>

            <div className="stats-grid">
                <div className="glass-card">
                    <div className="stat-label">Aktuelle Kosten (letzter Eintrag)</div>
                    <div className="stat-value" style={{ color: 'var(--success)' }}>
                        {data.lastPeriodCost ? data.lastPeriodCost.toFixed(2) + ' €' : '-'}
                    </div>
                    <div className="stat-label" style={{ marginTop: '0.5rem' }}>
                        Basiert auf aktuellem Tarif
                    </div>
                </div>

                <div className="glass-card">
                    <div className="stat-label">Letzter Zählerstand</div>
                    <div className="stat-value">
                        {data.latestReading ? new Date(data.latestReading.date).toLocaleDateString() : '-'}
                    </div>
                    {data.latestReading && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            HT: {data.latestReading.valueHT} | NT: {data.latestReading.valueNT}
                        </div>
                    )}
                </div>

                <div className="glass-card">
                    <div className="stat-label">Aktueller Tarif</div>
                    {data.currentPrice ? (
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>HT: {data.currentPrice.priceHT} €</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>NT: {data.currentPrice.priceNT} €</div>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)' }}>Nicht konfiguriert</div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="glass-card">
                    <h2>Schnellzugriff</h2>
                    <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                        <Link href="/readings" className="btn" style={{ textAlign: 'center' }}>+ Neuer Zählerstand</Link>
                        <Link href="/settings" className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', boxShadow: 'none' }}>Einstellungen bearbeiten</Link>
                    </div>
                </div>

                <div className="glass-card">
                    <h2>Info</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Willkommen im Stromabrechnungs-Portal.
                        Bitte konfigurieren Sie zuerst die Preise unter "Einstellungen", bevor Sie Zählerstände eintragen.
                    </p>
                </div>
            </div>
        </div>
    )
}

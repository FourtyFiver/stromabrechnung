import Link from "next/link"
import ConsumptionChart from "./components/ConsumptionChart"

export const dynamic = 'force-dynamic'

async function getDashboardData() {
    const readings = await prisma.reading.findMany({
        orderBy: { date: 'asc' },
    })

    const currentPrice = await prisma.priceConfig.findFirst({
        orderBy: { validFrom: 'desc' }
    })

    // Calculate costs and prepare chart data
    let totalCost = 0
    let lastPeriodCost = 0
    let chartData = []

    if (readings.length >= 2 && currentPrice) {
        // Loop through all readings to generate chart history
        for (let i = 1; i < readings.length; i++) {
            const prev = readings[i - 1]
            const curr = readings[i]

            const deltaHT = curr.valueHT - prev.valueHT
            const deltaNT = curr.valueNT - prev.valueNT
            const cost = (deltaHT * currentPrice.priceHT) + (deltaNT * currentPrice.priceNT)

            // Safeguard against NaN or invalid dates
            const dateObj = new Date(curr.date)
            const isValidDate = !isNaN(dateObj.getTime())
            const formattedDate = isValidDate
                ? dateObj.toLocaleDateString('de-DE', { month: '2-digit', year: '2-digit' })
                : 'Invalid Date'

            chartData.push({
                date: formattedDate,
                ht: isFinite(deltaHT) ? parseFloat(deltaHT.toFixed(1)) : 0,
                nt: isFinite(deltaNT) ? parseFloat(deltaNT.toFixed(1)) : 0,
                cost: isFinite(cost) ? parseFloat(cost.toFixed(2)) : 0
            })
        }

        // Last period for the big simplified stat
        lastPeriodCost = chartData[chartData.length - 1].cost
    }

    const latestReading = readings[readings.length - 1]

    return {
        latestReading,
        readingsCount: readings.length,
        currentPrice,
        lastPeriodCost,
        chartData
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

            {data.chartData && data.chartData.length > 0 && (
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                    <h2>Verbrauch & Kosten Verlauf</h2>
                    <ConsumptionChart data={data.chartData} />
                </div>
            )}

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

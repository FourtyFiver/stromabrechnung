import prisma from "@/lib/db"
import Link from "next/link"
import ConsumptionChart from "./components/ConsumptionChart"
import SendReportButton from "./components/SendReportButton"
import { calculatePeriodCost } from "@/lib/billing"

export const dynamic = 'force-dynamic'

async function getDashboardData() {
    const readings = await prisma.reading.findMany({
        orderBy: { date: 'asc' },
    })

    const allPrices = await prisma.priceConfig.findMany({
        orderBy: { validFrom: 'desc' }
    })

    // Calculate costs and prepare chart data
    let totalCost = 0
    let lastPeriodCost = 0
    let lastPeriodPriceConfig = null
    let lastPeriodBaseFee = 0
    let lastPeriodMonths = 0
    let chartData = []

    if (readings.length >= 2 && allPrices.length > 0) {
        // Loop through all readings to generate chart history
        for (let i = 1; i < readings.length; i++) {
            const prev = readings[i - 1]
            const curr = readings[i]

            // Find the price config that was valid at the time of the reading (or closest before it)
            // Since allPrices is sorted desc by validFrom, the first one that is <= curr.date is the correct one.
            const relevantPrice = allPrices.find(p => p.validFrom <= curr.date) || allPrices[allPrices.length - 1] // Fallback to oldest if none found (should cover initial period)

            if (!relevantPrice) continue // Should not happen if prices exist


            // Use shared billing logic
            const result = calculatePeriodCost(prev, curr, relevantPrice)

            if (!result) continue

            // Safeguard against NaN or invalid dates
            const dateObj = new Date(curr.date)
            const isValidDate = !isNaN(dateObj.getTime())
            const formattedDate = isValidDate
                ? dateObj.toLocaleDateString('de-DE', { month: '2-digit', year: '2-digit' })
                : 'Invalid Date'

            chartData.push({
                date: formattedDate,
                ht: result.diffHT,
                nt: result.diffNT,
                cost: result.total,
                baseFeeCost: result.baseFeeCost,
                billingMonths: result.billingMonths,
                priceSource: relevantPrice
            })
        }

        // Last period for the big simplified stat
        if (chartData.length > 0) {
            lastPeriodCost = chartData[chartData.length - 1].cost
            lastPeriodPriceConfig = chartData[chartData.length - 1].priceSource
            lastPeriodBaseFee = chartData[chartData.length - 1].baseFeeCost
            lastPeriodMonths = chartData[chartData.length - 1].billingMonths
        }
    }

    const latestReading = readings[readings.length - 1]
    // Current active price for display "Aktueller Tarif"
    const currentPrice = allPrices[0]

    return {
        latestReading,
        readingsCount: readings.length,
        currentPrice,
        lastPeriodCost,
        lastPeriodBaseFee,
        lastPeriodMonths,
        lastPeriodPriceConfig,
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="stat-label">Aktuelle Kosten (letzter Eintrag)</div>

                            {data.lastPeriodCost ? (
                                <div>
                                    <div className="stat-value" style={{ color: 'var(--success)' }}>
                                        {data.lastPeriodCost.toFixed(2) + ' €'}
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>(Gesamt)</span>
                                    </div>

                                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>Strom:</span>
                                            <span style={{ fontWeight: 'bold' }}>{(data.lastPeriodCost - data.lastPeriodBaseFee).toFixed(2)} €</span>
                                        </div>
                                        {data.lastPeriodBaseFee > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span>Grundgebühr ({data.lastPeriodMonths} Mon.):</span>
                                                <span style={{ fontWeight: 'bold' }}>{data.lastPeriodBaseFee.toFixed(2)} €</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="stat-value" style={{ color: 'var(--text-muted)' }}>-</div>
                            )}

                            <div className="stat-label" style={{ marginTop: '0.5rem' }}>
                                Basiert auf aktuellem Tarif
                            </div>
                        </div>
                        <div className="icon-bg" style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '12px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="stat-label">Letzter Zählerstand</div>
                            <div className="stat-value">
                                {data.latestReading ? new Date(data.latestReading.date).toLocaleDateString('de-DE') : '-'}
                            </div>
                            {data.latestReading && (
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    HT: {data.latestReading.valueHT} | NT: {data.latestReading.valueNT}
                                </div>
                            )}
                        </div>
                        <div className="icon-bg" style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: '12px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
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
                        <div className="icon-bg" style={{ background: 'rgba(167, 139, 250, 0.2)', padding: '10px', borderRadius: '12px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {data.chartData && data.chartData.length > 0 && (
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                    <h2>Verbrauch & Kosten Verlauf</h2>
                    <ConsumptionChart data={data.chartData} />
                </div>
            )}

            <div className="responsive-grid-2">
                <div className="glass-card">
                    <h2>Schnellzugriff</h2>
                    <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                        <Link href="/readings" className="btn" style={{ textAlign: 'center' }}>+ Neuer Zählerstand</Link>
                        <SendReportButton />
                        <Link href="/billing-history" className="btn" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', textAlign: 'center' }}>💰 Abrechnungs-Historie</Link>
                        <Link href="/settings" className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', boxShadow: 'none', textAlign: 'center' }}>Einstellungen bearbeiten</Link>
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

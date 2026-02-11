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

    // Count unbilled readings
    const unbilledCount = readings.filter(r => !r.billedAt).length

    // Calculate costs and prepare chart data
    let lastPeriodCost = 0
    let lastPeriodBaseFee = 0
    let lastPeriodMonths = 0
    let chartData = []

    if (readings.length >= 2 && allPrices.length > 0) {
        for (let i = 1; i < readings.length; i++) {
            const prev = readings[i - 1]
            const curr = readings[i]

            const relevantPrice = allPrices.find(p => p.validFrom <= curr.date) || allPrices[allPrices.length - 1]
            if (!relevantPrice) continue

            const result = calculatePeriodCost(prev, curr, relevantPrice)
            if (!result) continue

            const dateObj = new Date(curr.date)
            const isValidDate = !isNaN(dateObj.getTime())
            const formattedDate = isValidDate
                ? dateObj.toLocaleDateString('de-DE', { month: '2-digit', year: '2-digit' })
                : '?'

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

        if (chartData.length > 0) {
            lastPeriodCost = chartData[chartData.length - 1].cost
            lastPeriodBaseFee = chartData[chartData.length - 1].baseFeeCost
            lastPeriodMonths = chartData[chartData.length - 1].billingMonths
        }
    }

    const latestReading = readings[readings.length - 1]
    const currentPrice = allPrices[0]

    // Total consumption
    let totalHT = 0
    let totalNT = 0
    if (readings.length >= 2) {
        totalHT = readings[readings.length - 1].valueHT - readings[0].valueHT
        totalNT = readings[readings.length - 1].valueNT - readings[0].valueNT
    }

    return {
        latestReading,
        readingsCount: readings.length,
        unbilledCount,
        currentPrice,
        lastPeriodCost,
        lastPeriodBaseFee,
        lastPeriodMonths,
        totalHT,
        totalNT,
        chartData
    }
}

export default async function Home() {
    const data = await getDashboardData()

    return (
        <div>
            <h1>Dashboard</h1>

            <div className="stats-grid">
                {/* Kosten Card */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div className="stat-label">Letzte Abrechnung</div>
                            {data.lastPeriodCost ? (
                                <div>
                                    <div className="stat-value" style={{ color: 'var(--success)', marginTop: '0.5rem' }}>
                                        {data.lastPeriodCost.toFixed(2)} €
                                    </div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                        <span>Strom: {(data.lastPeriodCost - data.lastPeriodBaseFee).toFixed(2)} €</span>
                                        {data.lastPeriodBaseFee > 0 && (
                                            <span>Grundgebühr: {data.lastPeriodBaseFee.toFixed(2)} € ({data.lastPeriodMonths} Mon.)</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="stat-value" style={{ color: 'var(--text-dim)', marginTop: '0.5rem' }}>—</div>
                            )}
                        </div>
                        <div className="icon-bg" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Zählerstand Card */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="stat-label">Letzter Zählerstand</div>
                            <div className="stat-value" style={{ marginTop: '0.5rem' }}>
                                {data.latestReading ? new Date(data.latestReading.date).toLocaleDateString('de-DE') : '—'}
                            </div>
                            {data.latestReading && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    HT: {data.latestReading.valueHT.toLocaleString('de-DE')} · NT: {data.latestReading.valueNT.toLocaleString('de-DE')}
                                </div>
                            )}
                        </div>
                        <div className="icon-bg" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                        </div>
                    </div>
                </div>

                {/* Tarif Card */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="stat-label">Aktueller Tarif</div>
                            {data.currentPrice ? (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.15rem' }}>HT</div>
                                            <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{data.currentPrice.priceHT} €</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.15rem' }}>NT</div>
                                            <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{data.currentPrice.priceNT} €</div>
                                        </div>
                                    </div>
                                    {data.currentPrice.baseFee > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                            Grundgebühr: {data.currentPrice.baseFee} €/Monat ({data.currentPrice.baseFeeSplit}%)
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-dim)', marginTop: '0.5rem' }}>Nicht konfiguriert</div>
                            )}
                        </div>
                        <div className="icon-bg" style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            {data.chartData && data.chartData.length > 0 && (
                <div className="glass-card" style={{ marginBottom: '1.25rem' }}>
                    <h2>📈 Verbrauch & Kosten</h2>
                    <ConsumptionChart data={data.chartData} />
                </div>
            )}

            {/* Quick Actions */}
            <div className="responsive-grid-2">
                <div className="glass-card">
                    <h2>Schnellzugriff</h2>
                    <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                        <Link href="/readings" className="btn" style={{ textAlign: 'center' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                            Neuer Zählerstand
                        </Link>
                        <SendReportButton />
                        <Link href="/billing-history" className="btn" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 0 12px rgba(139, 92, 246, 0.3)' }}>
                            💰 Abrechnungs-Historie
                        </Link>
                        <Link href="/settings" className="btn btn-outline" style={{ textAlign: 'center' }}>
                            Einstellungen
                        </Link>
                    </div>
                </div>

                <div className="glass-card">
                    <h2>Status</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Zählerstände</span>
                            <span className="badge badge-info">{data.readingsCount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Offene Abrechnung</span>
                            <span className={`badge ${data.unbilledCount > 0 ? 'badge-warning' : 'badge-success'}`}>
                                {data.unbilledCount > 0 ? `${data.unbilledCount} offen` : 'Alle abgerechnet'}
                            </span>
                        </div>
                        {data.totalHT > 0 && (
                            <>
                                <hr className="divider" />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gesamtverbrauch HT</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{data.totalHT.toFixed(0)} kWh</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gesamtverbrauch NT</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{data.totalNT.toFixed(0)} kWh</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

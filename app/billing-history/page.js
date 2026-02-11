import prisma from "@/lib/db"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function BillingHistoryPage() {
    const history = await prisma.billPeriod.findMany({
        orderBy: { sentAt: 'desc' }
    })

    // Summary stats
    const totalBilled = history.reduce((sum, bp) => sum + bp.totalCost, 0)

    return (
        <div>
            <h1>Abrechnungs-Historie</h1>

            {history.length > 0 && (
                <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                    <div className="glass-card">
                        <div className="stat-label">Abrechnungen gesamt</div>
                        <div className="stat-value" style={{ marginTop: '0.35rem' }}>{history.length}</div>
                    </div>
                    <div className="glass-card">
                        <div className="stat-label">Gesamtbetrag</div>
                        <div className="stat-value" style={{ color: 'var(--success)', marginTop: '0.35rem' }}>{totalBilled.toFixed(2)} €</div>
                    </div>
                    <div className="glass-card">
                        <div className="stat-label">Letzte Abrechnung</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '0.35rem' }}>
                            {history[0].sentAt.toLocaleDateString('de-DE')}
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-card">
                {history.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">💰</div>
                        <p style={{ fontSize: '1.1rem' }}>Noch keine Abrechnungen vorhanden</p>
                        <p>Erstelle einen Report über das Dashboard, um hier Einträge zu sehen.</p>
                        <Link href="/" className="btn" style={{ marginTop: '1.25rem' }}>
                            Zum Dashboard
                        </Link>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Zeitraum</th>
                                    <th>Verbrauch</th>
                                    <th>Kosten</th>
                                    <th>Gesendet</th>
                                    <th>Via</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((bp) => (
                                    <tr key={bp.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                {bp.fromDate.toLocaleDateString('de-DE')} → {bp.toDate.toLocaleDateString('de-DE')}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                                                {bp.billingMonths} Monat{bp.billingMonths !== 1 ? 'e' : ''}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem' }}>HT: {bp.diffHT.toFixed(1)} kWh</div>
                                            <div style={{ fontSize: '0.85rem' }}>NT: {bp.diffNT.toFixed(1)} kWh</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1rem' }}>
                                                {bp.totalCost.toFixed(2)} €
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                                                Strom: {bp.energyCost.toFixed(2)}€ · Grund: {bp.baseFeeCost.toFixed(2)}€
                                            </div>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                                            {bp.sentAt.toLocaleDateString('de-DE')}
                                        </td>
                                        <td>
                                            <span className={`badge ${bp.sentVia === 'telegram' ? 'badge-info' : 'badge-purple'}`}>
                                                {bp.sentVia === 'telegram' ? '📱 Telegram' : bp.sentVia}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

import prisma from "@/lib/db"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function BillingHistoryPage() {
    const history = await prisma.billPeriod.findMany({
        orderBy: { sentAt: 'desc' }
    })

    return (
        <div>
            <h1>Abrechnungs-Historie</h1>

            <div className="glass-card">
                {history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Noch keine Abrechnungen vorhanden</p>
                        <p>Erstelle einen Report über das Dashboard, um hier Einträge zu sehen.</p>
                        <Link href="/" className="btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
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
                                            <div style={{ fontWeight: 500 }}>
                                                {bp.fromDate.toLocaleDateString('de-DE')} → {bp.toDate.toLocaleDateString('de-DE')}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {bp.billingMonths} Monat{bp.billingMonths !== 1 ? 'e' : ''}
                                            </div>
                                        </td>
                                        <td>
                                            <div>HT: {bp.diffHT.toFixed(1)} kWh</div>
                                            <div>NT: {bp.diffNT.toFixed(1)} kWh</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                                                {bp.totalCost.toFixed(2)} €
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Strom: {bp.energyCost.toFixed(2)}€ | Grund: {bp.baseFeeCost.toFixed(2)}€
                                            </div>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {bp.sentAt.toLocaleDateString('de-DE')}
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: bp.sentVia === 'telegram'
                                                    ? 'rgba(59, 130, 246, 0.2)'
                                                    : 'rgba(167, 139, 250, 0.2)',
                                                color: bp.sentVia === 'telegram'
                                                    ? '#60a5fa'
                                                    : '#a78bfa'
                                            }}>
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

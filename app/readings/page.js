import prisma from "@/lib/db"
import ReadingsForm from "./ReadingsForm"
import ReadingRow from "./ReadingRow"
import { ACTION_LABELS, describeChange } from "@/lib/reading-history"

export const dynamic = 'force-dynamic'

export default async function ReadingsPage() {
    const [readings, changes, periods] = await Promise.all([
        prisma.reading.findMany({ orderBy: [{ date: 'desc' }, { id: 'desc' }] }),
        prisma.readingChange.findMany({ orderBy: { changedAt: 'desc' }, take: 50 }),
        prisma.billPeriod.findMany({ select: { fromReadingId: true, toReadingId: true } })
    ])
    // Von einer Abrechnung referenzierte Stände sind gesperrt (Bearbeiten/Löschen)
    const referenced = new Set(periods.flatMap((p) => [p.fromReadingId, p.toReadingId]))
    const rows = readings.map((r) => ({
        id: r.id,
        date: r.date.toISOString(),
        valueHT: r.valueHT,
        valueNT: r.valueNT,
        comment: r.comment,
        billed: Boolean(r.billedAt),
        locked: Boolean(r.billedAt) || referenced.has(r.id),
        meterChange: r.meterChange,
        oldFinalHT: r.oldFinalHT,
        oldFinalNT: r.oldFinalNT
    }))

    return (
        <div>
            <h1>Zählerstände</h1>

            <div className="glass-card" style={{ marginBottom: '1.25rem' }}>
                <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '0.4rem' }}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                    Neuen Zählerstand eintragen
                </h2>
                <ReadingsForm />
            </div>

            <div className="glass-card">
                <h2>Verlauf</h2>
                {readings.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <p style={{ fontSize: '1.1rem' }}>Keine Einträge vorhanden</p>
                        <p>Tragen Sie oben Ihren ersten Zählerstand ein.</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Datum</th>
                                    <th>HT</th>
                                    <th>NT</th>
                                    <th>Status</th>
                                    <th>Kommentar</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((reading) => (
                                    <ReadingRow key={reading.id} reading={reading} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="glass-card" style={{ marginTop: '1.25rem' }}>
                <details>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Änderungshistorie ({changes.length})</summary>
                    {changes.length === 0 ? (
                        <p style={{ color: 'var(--text-dim)' }}>Noch keine Änderungen aufgezeichnet.</p>
                    ) : (
                        <div className="table-wrapper" style={{ marginTop: '0.75rem' }}>
                            <table>
                                <thead>
                                    <tr><th>Zeitpunkt</th><th>Aktion</th><th>Details</th></tr>
                                </thead>
                                <tbody>
                                    {changes.map((c) => (
                                        <tr key={c.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{c.changedAt.toLocaleString('de-DE')}</td>
                                            <td>{ACTION_LABELS[c.action] || c.action}</td>
                                            <td style={{ color: 'var(--text-dim)' }}>{describeChange(c)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </details>
            </div>
        </div>
    )
}

import prisma from "@/lib/db"
import ReadingsForm from "./ReadingsForm"
import DeleteReadingButton from "./DeleteReadingButton"

export const dynamic = 'force-dynamic'

export default async function ReadingsPage() {
    const readings = await prisma.reading.findMany({
        orderBy: { date: 'desc' }
    })

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
                                {readings.map((reading) => (
                                    <tr key={reading.id}>
                                        <td style={{ fontWeight: 500 }}>{reading.date.toLocaleDateString('de-DE')}</td>
                                        <td>{reading.valueHT.toLocaleString('de-DE')} kWh</td>
                                        <td>{reading.valueNT.toLocaleString('de-DE')} kWh</td>
                                        <td>
                                            {reading.billedAt ? (
                                                <span className="badge badge-success">✓ Abgerechnet</span>
                                            ) : (
                                                <span className="badge badge-warning">Offen</span>
                                            )}
                                        </td>
                                        <td style={{ color: 'var(--text-dim)' }}>{reading.comment || '—'}</td>
                                        <td>
                                            <DeleteReadingButton id={reading.id} />
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

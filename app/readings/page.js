import prisma from "@/lib/db"
import ReadingsForm from "./ReadingsForm"

export const dynamic = 'force-dynamic'

export default async function ReadingsPage() {
    const readings = await prisma.reading.findMany({
        orderBy: { date: 'desc' }
    })

    return (
        <div>
            <h1>Zählerstände</h1>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <h2>Neuen Zählerstand eintragen</h2>
                <ReadingsForm />
            </div>

            <div className="glass-card">
                <h2>Verlauf</h2>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Datum</th>
                                <th>HT</th>
                                <th>NT</th>
                                <th>Kommentar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {readings.map((reading) => (
                                <tr key={reading.id}>
                                    <td>{reading.date.toLocaleDateString('de-DE')}</td>
                                    <td>{reading.valueHT} kWh</td>
                                    <td>{reading.valueNT} kWh</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{reading.comment || '-'}</td>
                                </tr>
                            ))}
                            {readings.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Keine Einträge vorhanden</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

import prisma from "@/lib/db"
import { addReading } from "@/app/actions"

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
                <form action={addReading} className="responsive-form-grid">
                    <div className="input-group">
                        <label>Datum</label>
                        <input type="date" name="date" className="input-field" required defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="input-group">
                        <label>HT Zählerstand (kWh)</label>
                        <input type="number" step="0.1" name="valueHT" className="input-field" required />
                    </div>
                    <div className="input-group">
                        <label>NT Zählerstand (kWh)</label>
                        <input type="number" step="0.1" name="valueNT" className="input-field" required />
                    </div>
                    <div className="input-group">
                        <label>Kommentar</label>
                        <input type="text" name="comment" className="input-field" />
                    </div>
                    <div className="input-group">
                        <button type="submit" className="btn" style={{ width: '100%' }}>Eintragen</button>
                    </div>
                </form>
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
                                    <td>{reading.date.toLocaleDateString()}</td>
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

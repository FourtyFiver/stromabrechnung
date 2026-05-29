import prisma from "@/lib/db"
import SettingsForm from "./SettingsForm"

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const [currentPrice, allPrices] = await Promise.all([
        prisma.priceConfig.findFirst({
            orderBy: { validFrom: 'desc' }
        }),
        prisma.priceConfig.findMany({
            orderBy: { validFrom: 'desc' }
        })
    ])

    return (
        <div>
            <h1>Einstellungen</h1>

            <div className="responsive-grid-2">
                <div className="glass-card">
                    <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--secondary-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }}><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        Neuen Strompreis festlegen
                    </h2>
                    <SettingsForm />
                </div>

                <div className="glass-card">
                    <h2>Aktueller Tarif</h2>
                    {currentPrice ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>HT Preis</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{currentPrice.priceHT} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>€/kWh</span></div>
                                </div>
                                <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>NT Preis</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{currentPrice.priceNT} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>€/kWh</span></div>
                                </div>
                            </div>
                            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Grundgebühr</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                                    {currentPrice.baseFee} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>€/Monat</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Anteil: {currentPrice.baseFeeSplit}%
                                </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                Gültig seit {currentPrice.validFrom.toLocaleDateString('de-DE')}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                            <div className="empty-icon">⚙️</div>
                            <p>Noch keine Preise konfiguriert.</p>
                            <p>Legen Sie links die aktuellen Strompreise fest.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Price History */}
            {allPrices.length > 1 && (
                <div className="glass-card" style={{ marginTop: '1.25rem' }}>
                    <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        Tarif-Historie
                    </h2>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Gültig ab</th>
                                    <th>HT (€/kWh)</th>
                                    <th>NT (€/kWh)</th>
                                    <th>Grundgebühr</th>
                                    <th>Anteil</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allPrices.map((price, index) => (
                                    <tr key={price.id} style={index === 0 ? { background: 'rgba(59, 130, 246, 0.06)' } : undefined}>
                                        <td style={{ fontWeight: index === 0 ? 600 : 400 }}>
                                            {price.validFrom.toLocaleDateString('de-DE')}
                                            {index === 0 && <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>Aktuell</span>}
                                        </td>
                                        <td>{price.priceHT.toFixed(4)}</td>
                                        <td>{price.priceNT.toFixed(4)}</td>
                                        <td>{price.baseFee.toFixed(2)} €</td>
                                        <td>{price.baseFeeSplit}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
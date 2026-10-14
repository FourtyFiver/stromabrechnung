const fmt = (n, d = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })
const sign = n => (n > 0 ? '+' : n < 0 ? '−' : '±')
const eur = n => `${fmt(n, 2)} €`
const date = d => new Date(d).toLocaleDateString('de-DE')

function Delta({ abs, pct, unit }) {
    if (abs === null) return <span style={{ color: 'var(--text-dim)' }}>—</span>
    // Mehrverbrauch/-kosten = schlecht (rot), weniger = gut (grün)
    const color = abs > 0 ? 'var(--danger, #ef4444)' : 'var(--success)'
    return (
        <span style={{ color, fontWeight: 700 }}>
            {sign(abs)}{unit === '€' ? eur(Math.abs(abs)) : `${fmt(Math.abs(abs))} kWh`}
            {pct !== null && ` (${sign(pct)}${fmt(Math.abs(pct), 1)} %)`}
        </span>
    )
}

export default function DashboardInsights({ yoy, projection }) {
    return (
        <div className="responsive-grid-2" style={{ marginBottom: '1.25rem' }}>
            <div className="glass-card">
                <div className="stat-label">Vorjahresvergleich</div>
                {yoy.ok ? (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {date(yoy.curStart)} – {date(yoy.cutoff)} vs. {date(yoy.prevStart)} – {date(yoy.prevEnd)}
                        </div>
                        <div className="insight-row">
                            <span style={{ color: 'var(--text-muted)' }}>Verbrauch</span>
                            <span>{fmt(yoy.cur.kwh)} kWh <span style={{ color: 'var(--text-dim)' }}>(Vorjahr {fmt(yoy.prev.kwh)})</span></span>
                        </div>
                        <div className="insight-row">
                            <span style={{ color: 'var(--text-muted)' }}>Differenz</span>
                            <Delta abs={yoy.deltaKwh.abs} pct={yoy.deltaKwh.pct} unit="kWh" />
                        </div>
                        <div className="insight-row">
                            <span style={{ color: 'var(--text-muted)' }}>Kosten</span>
                            <span>{yoy.cur.cost === null ? '—' : eur(yoy.cur.cost)} <span style={{ color: 'var(--text-dim)' }}>(Vorjahr {yoy.prev.cost === null ? '—' : eur(yoy.prev.cost)})</span></span>
                        </div>
                        <div className="insight-row">
                            <span style={{ color: 'var(--text-muted)' }}>Differenz</span>
                            <Delta abs={yoy.deltaCost.abs} pct={yoy.deltaCost.pct} unit="€" />
                        </div>
                    </div>
                ) : (
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{yoy.reason}</p>
                )}
            </div>

            <div className="glass-card">
                <div className="stat-label">Jahreskosten-Hochrechnung</div>
                {projection.ok ? (
                    <div style={{ marginTop: '0.5rem' }}>
                        {projection.cost !== null ? (
                            <div className="stat-value" style={{ color: 'var(--primary-light)' }}>{eur(projection.cost)}</div>
                        ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Kosten nicht berechenbar: Kein gültiger Strompreis hinterlegt.</div>
                        )}
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span>Verbrauch: ca. {fmt(projection.kwh)} kWh/Jahr (HT {fmt(projection.ht)} · NT {fmt(projection.nt)})</span>
                            {projection.cost !== null && (
                                <span>Strom: {eur(projection.energyCost)} · Grundgebühr: {eur(projection.baseFeeCost)}</span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
                            {projection.isFullYear
                                ? 'Basis: letzte 12 Monate'
                                : `Basis: alle Daten (${fmt(projection.days / (365 / 12), 1)} Monate, weniger als 12 – ungenauer)`}
                            {' · '}{date(projection.start)} – {date(projection.end)} · aktueller Tarif
                        </div>
                    </div>
                ) : (
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{projection.reason}</p>
                )}
            </div>
        </div>
    )
}

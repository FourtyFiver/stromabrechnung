export default function ExportLinks({ years = [], showReadings = false }) {
    return (
        <div className="export-links" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {showReadings && (
                <a href="/api/export/readings" className="btn btn-outline" download>
                    ⬇ Zählerstände (CSV)
                </a>
            )}
            <a href="/api/export/billing" className="btn btn-outline" download>
                ⬇ Abrechnungen (CSV)
            </a>
            {years.map(y => (
                <a key={y} href={`/api/export/billing?year=${y}`} className="btn btn-outline" download>
                    ⬇ {y}
                </a>
            ))}
        </div>
    )
}

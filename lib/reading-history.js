// Darstellung der Änderungshistorie (pure Funktionen)

const num = (v) => (v == null ? '—' : Number(v).toLocaleString('de-DE'))
const day = (d) => new Date(d).toLocaleDateString('de-DE')

export const ACTION_LABELS = { create: 'Angelegt', update: 'Geändert', delete: 'Gelöscht' }

export function snapshotReading(r) {
    return JSON.stringify({
        date: new Date(r.date).toISOString(),
        valueHT: r.valueHT,
        valueNT: r.valueNT,
        comment: r.comment ?? '',
        meterChange: Boolean(r.meterChange),
        oldFinalHT: r.oldFinalHT ?? null,
        oldFinalNT: r.oldFinalNT ?? null
    })
}

function parse(s) {
    try { return s ? JSON.parse(s) : null } catch { return null }
}

function describeSnapshot(s) {
    if (!s) return ''
    const parts = [`${day(s.date)}`, `HT ${num(s.valueHT)}`, `NT ${num(s.valueNT)}`]
    if (s.meterChange) parts.push(`Zählertausch (alt: HT ${num(s.oldFinalHT)} / NT ${num(s.oldFinalNT)})`)
    if (s.comment) parts.push(`„${s.comment}“`)
    return parts.join(', ')
}

/** Liefert eine lesbare Zeile, z. B. "HT 1.234,5 → 1.240". */
export function describeChange(change) {
    const before = parse(change.before)
    const after = parse(change.after)
    if (change.action === 'create') return describeSnapshot(after)
    if (change.action === 'delete') return describeSnapshot(before)
    if (!before || !after) return ''
    const diffs = []
    if (before.date !== after.date) diffs.push(`Datum ${day(before.date)} → ${day(after.date)}`)
    if (before.valueHT !== after.valueHT) diffs.push(`HT ${num(before.valueHT)} → ${num(after.valueHT)}`)
    if (before.valueNT !== after.valueNT) diffs.push(`NT ${num(before.valueNT)} → ${num(after.valueNT)}`)
    if (before.meterChange !== after.meterChange) diffs.push(`Zählertausch ${before.meterChange ? 'ja' : 'nein'} → ${after.meterChange ? 'ja' : 'nein'}`)
    if (before.oldFinalHT !== after.oldFinalHT) diffs.push(`Endstand alt HT ${num(before.oldFinalHT)} → ${num(after.oldFinalHT)}`)
    if (before.oldFinalNT !== after.oldFinalNT) diffs.push(`Endstand alt NT ${num(before.oldFinalNT)} → ${num(after.oldFinalNT)}`)
    if (before.comment !== after.comment) diffs.push(`Kommentar „${before.comment}“ → „${after.comment}“`)
    return diffs.join('; ') || 'Keine Änderung'
}

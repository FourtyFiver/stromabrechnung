// Reine Validierung eines Zählerstands gegen seine Nachbarn (kein DB-Zugriff).
// prev: letzter Stand am/vor dem Datum, next: erster Stand nach dem Datum
// (jeweils ohne den bearbeiteten Eintrag selbst) oder null.

const fmt = (v) => v.toLocaleString('de-DE')

/**
 * Liefert eine Liste deutscher Warnungen (leer = gültig).
 * Bei Zählertausch zählt der Endstand des alten Zählers gegen den Vorgänger;
 * liegt beim Nachfolger ein Zählertausch, zählt dessen Endstand des alten Zählers.
 */
export function checkReadingNeighbours({ valueHT, valueNT, meterChange = false, oldFinalHT, oldFinalNT, prev = null, next = null }) {
    const warnings = []

    if (prev) {
        const checkHT = meterChange ? oldFinalHT : valueHT
        const checkNT = meterChange ? oldFinalNT : valueNT
        const label = meterChange ? 'Endstand alter Zähler ' : ''
        if (checkHT < prev.valueHT) {
            warnings.push(`${label}HT ${fmt(checkHT)} ist niedriger als vorheriger Stand (${fmt(prev.valueHT)} kWh)`)
        }
        if (checkNT < prev.valueNT) {
            warnings.push(`${label}NT ${fmt(checkNT)} ist niedriger als vorheriger Stand (${fmt(prev.valueNT)} kWh)`)
        }
    }

    if (next) {
        const nextHT = next.meterChange && next.oldFinalHT != null ? next.oldFinalHT : next.valueHT
        const nextNT = next.meterChange && next.oldFinalNT != null ? next.oldFinalNT : next.valueNT
        const ownHT = valueHT
        const ownNT = valueNT
        if (ownHT > nextHT) {
            warnings.push(`HT ${fmt(ownHT)} ist höher als der spätere Stand (${fmt(nextHT)} kWh)`)
        }
        if (ownNT > nextNT) {
            warnings.push(`NT ${fmt(ownNT)} ist höher als der spätere Stand (${fmt(nextNT)} kWh)`)
        }
    }

    return warnings
}

/** Findet Vorgänger/Nachfolger in einer Liste (Pure-Variante, ignoriert excludeId). */
export function findNeighbours(readings, date, excludeId = null) {
    const t = new Date(date).getTime()
    const list = readings.filter((r) => r.id !== excludeId)
    const prev = list.filter((r) => new Date(r.date).getTime() <= t).sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null
    const next = list.filter((r) => new Date(r.date).getTime() > t).sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null
    return { prev, next }
}

const dayKey = (d) => new Date(d).toISOString().slice(0, 10)

/**
 * Am selben Kalendertag darf neben einem Zählertausch kein weiterer Stand liegen
 * (die Reihenfolge gleicher Zeitstempel wäre undefiniert). `others` = alle übrigen
 * Stände (ohne den bearbeiteten). Liefert eine deutsche Fehlermeldung oder null.
 */
export function checkSameDayMeterChange({ date, meterChange = false, others = [] }) {
    const key = dayKey(date)
    const clash = others.some((r) => dayKey(r.date) === key && (meterChange || r.meterChange))
    if (!clash) return null
    return 'Am selben Tag existiert bereits ein Zählerstand und einer der Einträge ist ein Zählertausch. Der Zählertausch-Eintrag enthält bereits die Endstände des alten Zählers, ein separater Zählerstand an diesem Tag ist nicht nötig.'
}

/**
 * Ein Stand, der nicht nach dem letzten abgerechneten Zeitraum liegt, würde ewig
 * "offen" bleiben. lastBilledDate = max(BillPeriod.toDate, Datum abgerechneter Stände) oder null.
 */
export function checkAfterBilledPeriod({ date, lastBilledDate = null }) {
    if (!lastBilledDate) return null
    if (new Date(date).getTime() > new Date(lastBilledDate).getTime()) return null
    return `Der Zählerstand liegt im bereits abgerechneten Zeitraum (bis ${new Date(lastBilledDate).toLocaleDateString('de-DE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}).`
}

import { calculateConsumption } from './billing.js'
import { findRelevantPrice } from './pricing.js'

const DAY = 86400000
const MONTH_DAYS = 365 / 12

const t = d => new Date(d).getTime()

/**
 * Verbrauch/Kosten eines beliebigen Zeitraums [from, to], interpoliert linear
 * zwischen den umgebenden Zählerständen. Verbrauch je Intervall kommt immer aus
 * calculateConsumption (Zählertausch-sicher). Preis je Teilstück: der zum
 * Intervallende gültige Preis (wie im Dashboard). Grundgebühr anteilig nach Tagen.
 *
 * @returns {{ht,nt,energyCost,baseFeeCost,cost,days}|null} null wenn Daten den
 *   Zeitraum nicht abdecken oder ungültig sind. cost/energyCost/baseFeeCost sind
 *   null, wenn für ein Teilstück kein Preis existiert.
 */
export function periodStats(readings, prices, from, to) {
    const rs = [...(readings || [])].sort((a, b) => t(a.date) - t(b.date))
    const a = t(from), b = t(to)
    if (rs.length < 2 || !(b > a)) return null
    if (t(rs[0].date) > a || t(rs[rs.length - 1].date) < b) return null

    let ht = 0, nt = 0, energy = 0, base = 0, priceMissing = false
    for (let i = 0; i < rs.length - 1; i++) {
        const t0 = t(rs[i].date), t1 = t(rs[i + 1].date)
        const lo = Math.max(a, t0), hi = Math.min(b, t1)
        if (t1 === t0) {
            // Zeitlich zusammenfallende Stände: Verbrauch fällt in diesen Zeitpunkt,
            // gezählt im Zeitraum (a, b] (wie bei der Abrechnung (von, bis])
            if (!(t0 > a && t0 <= b)) continue
            const z = calculateConsumption(rs[i], rs[i + 1])
            if (!z) return null
            ht += z.diffHT
            nt += z.diffNT
            const zp = findRelevantPrice(prices, new Date(t0))
            if (!zp) { priceMissing = true; continue }
            energy += z.diffHT * zp.priceHT + z.diffNT * zp.priceNT
            continue
        }
        if (!(hi > lo)) continue
        const seg = calculateConsumption(rs[i], rs[i + 1])
        if (!seg) return null
        const f = (hi - lo) / (t1 - t0)
        const sHT = seg.diffHT * f, sNT = seg.diffNT * f
        ht += sHT
        nt += sNT
        const p = findRelevantPrice(prices, new Date(hi))
        if (!p) { priceMissing = true; continue }
        energy += sHT * p.priceHT + sNT * p.priceNT
        const split = p.baseFeeSplit !== undefined && p.baseFeeSplit !== null ? p.baseFeeSplit : 50
        base += p.baseFee * ((hi - lo) / DAY / MONTH_DAYS) * (split / 100)
    }
    return {
        ht, nt,
        energyCost: priceMissing ? null : energy,
        baseFeeCost: priceMissing ? null : base,
        cost: priceMissing ? null : energy + base,
        days: (b - a) / DAY
    }
}

// Alle Jahresgrenzen in UTC: Ablesedaten sind UTC-Mitternacht-Zeitstempel (Datumsfeld),
// lokale Grenzen würden z. B. in Europe/Berlin den 1.1. knapp verfehlen.
function sameDayLastYear(d) {
    const y = d.getUTCFullYear() - 1
    const m = d.getUTCMonth()
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
    return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()))
}

function delta(cur, prev) {
    if (cur === null || prev === null) return { abs: null, pct: null }
    return { abs: cur - prev, pct: prev > 0 ? ((cur - prev) / prev) * 100 : null }
}

/**
 * Vorjahresvergleich: 1.1. bis Stichtag des laufenden Jahres vs. gleicher
 * Zeitraum des Vorjahres. Stichtag = min(now, letzter Zählerstand), da nicht
 * extrapoliert wird. Gibt { ok:false, reason } zurück, wenn Daten nicht reichen.
 */
export function yearOverYear(readings, prices, now = new Date()) {
    const nowD = new Date(now)
    const rs = [...(readings || [])].sort((a, b) => t(a.date) - t(b.date))
    if (rs.length < 2) return { ok: false, reason: 'Es werden mindestens zwei Zählerstände benötigt.' }
    const lastDate = new Date(rs[rs.length - 1].date)
    const cutoff = lastDate < nowD ? lastDate : nowD
    const curStart = new Date(Date.UTC(nowD.getUTCFullYear(), 0, 1))
    const prevStart = new Date(Date.UTC(nowD.getUTCFullYear() - 1, 0, 1))
    const prevEnd = sameDayLastYear(cutoff)

    const cur = periodStats(rs, prices, curStart, cutoff)
    const prev = periodStats(rs, prices, prevStart, prevEnd)
    if (!cur || !prev) {
        return { ok: false, reason: 'Für einen Vorjahresvergleich fehlen Zählerstände, die den Zeitraum seit Jahresbeginn und denselben Zeitraum des Vorjahres abdecken.' }
    }
    const curKwh = cur.ht + cur.nt, prevKwh = prev.ht + prev.nt
    return {
        ok: true,
        cutoff, curStart, prevStart, prevEnd,
        cur: { kwh: curKwh, ht: cur.ht, nt: cur.nt, cost: cur.cost },
        prev: { kwh: prevKwh, ht: prev.ht, nt: prev.nt, cost: prev.cost },
        deltaKwh: delta(curKwh, prevKwh),
        deltaCost: delta(cur.cost, prev.cost)
    }
}

/**
 * Jahreskosten-Hochrechnung: Verbrauch der letzten 12 Monate (bis zum letzten
 * Zählerstand; bei weniger Daten alle Daten, isFullYear=false) wird auf 365 Tage
 * skaliert. Preis: aktuell gültiger Preis zu `now`, Grundgebühr = baseFee*12*split.
 */
export function projectAnnual(readings, prices, now = new Date()) {
    const rs = [...(readings || [])].sort((a, b) => t(a.date) - t(b.date))
    if (rs.length < 2) return { ok: false, reason: 'Es werden mindestens zwei Zählerstände benötigt.' }
    const end = new Date(rs[rs.length - 1].date)
    const first = new Date(rs[0].date)
    const yearBack = new Date(end); yearBack.setFullYear(yearBack.getFullYear() - 1)
    const isFullYear = first <= yearBack
    const start = isFullYear ? yearBack : first
    const days = (end - start) / DAY
    if (days < 30) return { ok: false, reason: 'Für eine Hochrechnung werden Daten über mindestens 30 Tage benötigt.' }

    const cons = periodStats(rs, [{ validFrom: new Date(0), priceHT: 0, priceNT: 0, baseFee: 0 }], start, end)
    if (!cons) return { ok: false, reason: 'Die Zählerstände sind für eine Hochrechnung nicht auswertbar.' }
    const scale = 365 / days
    const ht = cons.ht * scale, nt = cons.nt * scale
    const price = findRelevantPrice(prices, new Date(now))
    let result = { ok: true, isFullYear, start, end, days, ht, nt, kwh: ht + nt, price: !!price, cost: null, energyCost: null, baseFeeCost: null }
    if (price) {
        const split = price.baseFeeSplit !== undefined && price.baseFeeSplit !== null ? price.baseFeeSplit : 50
        result.energyCost = ht * price.priceHT + nt * price.priceNT
        result.baseFeeCost = price.baseFee * 12 * (split / 100)
        result.cost = result.energyCost + result.baseFeeCost
    }
    return result
}

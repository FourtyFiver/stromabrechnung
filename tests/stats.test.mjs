import { test } from 'node:test'
import assert from 'node:assert/strict'
import { periodStats, yearOverYear, projectAnnual } from '../lib/stats.js'

const r = (date, ht, nt, extra = {}) => ({ date: new Date(date), valueHT: ht, valueNT: nt, ...extra })
const prices = [{ validFrom: new Date(2020, 0, 1), priceHT: 0.3, priceNT: 0.2, baseFee: 10, baseFeeSplit: 50 }]
const close = (a, b, eps = 0.5) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`)

// 1000 kWh HT pro Jahr gleichmäßig (365 Tage), NT 0
const readings = [r('2024-01-01', 0, 0), r('2025-01-01', 1000, 0), r('2026-01-01', 2000, 0), r('2026-07-02', 2500, 0)]

test('periodStats interpoliert linear', () => {
    const s = periodStats(readings, prices, new Date('2024-01-01'), new Date('2024-07-01'))
    close(s.ht, 1000 * (182 / 366), 1)
    assert.ok(s.cost > 0)
})
test('periodStats null wenn nicht abgedeckt', () => {
    assert.equal(periodStats(readings, prices, new Date('2023-01-01'), new Date('2024-07-01')), null)
    assert.equal(periodStats(readings, prices, new Date('2025-01-01'), new Date('2027-01-01')), null)
})
test('periodStats ohne Preis: Kosten null, Verbrauch da', () => {
    const s = periodStats(readings, [], new Date('2025-01-01'), new Date('2025-06-01'))
    assert.equal(s.cost, null)
    assert.ok(s.ht > 0)
})
test('periodStats berücksichtigt Zählertausch', () => {
    const rs = [r('2025-01-01', 100, 0), r('2025-07-01', 5, 0, { meterChange: true, oldFinalHT: 200, oldFinalNT: 0 }), r('2026-01-01', 105, 0)]
    const s = periodStats(rs, prices, new Date('2025-01-01'), new Date('2026-01-01'))
    close(s.ht, 200, 0.001)
})
test('yearOverYear Delta', () => {
    const now = new Date('2026-07-02')
    const y = yearOverYear(readings, prices, now)
    assert.equal(y.ok, true)
    assert.ok(y.cur.kwh > 0 && y.prev.kwh > 0)
    assert.ok(y.deltaKwh.abs > 0) // 500 in 182 Tagen vs ~500*... Vorjahr 1000/365*182
    assert.ok(y.deltaKwh.pct !== null)
    close(y.cur.kwh, 500, 1)
    close(y.prev.kwh, 1000 * 182 / 365, 2)
})
test('yearOverYear Hinweis bei zu wenigen Daten', () => {
    const y = yearOverYear([r('2026-01-01', 0, 0), r('2026-03-01', 10, 0)], prices, new Date('2026-03-02'))
    assert.equal(y.ok, false)
    assert.match(y.reason, /Vorjahr/)
    assert.equal(yearOverYear([], prices, new Date()).ok, false)
})
test('yearOverYear Schaltjahr-Stichtag 29.2.', () => {
    const rs = [r('2024-01-01', 0, 0), r('2026-02-28', 2000, 0)]
    const y = yearOverYear(rs, prices, new Date('2026-02-28'))
    assert.equal(y.ok, true)
})
test('projectAnnual: volle 12 Monate', () => {
    const p = projectAnnual(readings, prices, new Date('2026-07-03'))
    assert.equal(p.ok, true)
    assert.equal(p.isFullYear, true)
    // 2025-07-02..2026-01-01 (~183/365*1000) + 500 kWh, skaliert auf 365 Tage
    const days = (new Date('2026-07-02') - new Date('2025-07-02')) / 86400000
    close(p.days, days, 1e-6)
    close(p.kwh, (1000 * 183 / 365 + 500) * 365 / days, 2)
    close(p.baseFeeCost, 60, 1e-9)
    close(p.cost, p.energyCost + 60, 1e-9)
})
test('projectAnnual: weniger als 12 Monate, Skalierung', () => {
    const rs = [r('2026-01-01', 0, 0), r('2026-04-01', 250, 100)]
    const p = projectAnnual(rs, prices, new Date('2026-04-02'))
    assert.equal(p.isFullYear, false)
    close(p.ht, 250 * 365 / 90, 1e-6)
    close(p.nt, 100 * 365 / 90, 1e-6)
})
test('projectAnnual: zu wenig Daten und fehlender Preis', () => {
    assert.equal(projectAnnual([r('2026-01-01', 0, 0), r('2026-01-10', 5, 0)], prices, new Date('2026-01-11')).ok, false)
    const p = projectAnnual([r('2026-01-01', 0, 0), r('2026-04-01', 250, 0)], [], new Date('2026-04-02'))
    assert.equal(p.ok, true)
    assert.equal(p.cost, null)
})

test('periodStats: Verbrauch zwischen zwei Ständen am selben Zeitpunkt geht nicht verloren', () => {
    const rs = [r('2025-01-01', 0, 0), r('2025-06-01', 100, 0), r('2025-06-01', 150, 0), r('2025-12-01', 200, 0)]
    const s = periodStats(rs, prices, new Date('2025-01-01'), new Date('2025-12-01'))
    close(s.ht, 200, 0.001)
})

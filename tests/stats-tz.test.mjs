import { test } from 'node:test'
import assert from 'node:assert/strict'

// Eigener Prozess pro Testdatei: Zeitzone vor jeder Datumsnutzung setzen
process.env.TZ = 'Europe/Berlin'
const { yearOverYear } = await import('../lib/stats.js')

const r = (date, ht) => ({ date: new Date(date), valueHT: ht, valueNT: 0 })
const prices = [{ validFrom: new Date('2020-01-01T00:00:00Z'), priceHT: 0.3, priceNT: 0.2, baseFee: 10, baseFeeSplit: 50 }]

test('yearOverYear in Europe/Berlin mit Erstablesung am 1.1.', () => {
    assert.equal(new Date(2026, 0, 1).getTimezoneOffset(), -60) // TZ wirksam
    const rs = [r('2025-01-01', 0), r('2025-07-01', 500), r('2026-01-01', 1000), r('2026-07-01', 1400)]
    const res = yearOverYear(rs, prices, new Date('2026-07-10T12:00:00Z'))
    assert.equal(res.ok, true)
})

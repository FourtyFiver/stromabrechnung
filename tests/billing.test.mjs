import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculatePeriodCost, calculateConsumption } from '../lib/billing.js'
import { findRelevantPrice } from '../lib/pricing.js'

const price = { priceHT: 0.3, priceNT: 0.2, baseFee: 10, baseFeeSplit: 50 }
const r = (date, ht, nt, extra = {}) => ({ date: new Date(date), valueHT: ht, valueNT: nt, ...extra })

test('normale Kosten', () => {
    const res = calculatePeriodCost(r('2024-01-15', 1000, 500), r('2024-02-15', 1100, 560), price)
    assert.equal(res.diffHT, 100)
    assert.equal(res.diffNT, 60)
    assert.equal(res.energyCost, 42) // 30 + 12
    assert.equal(res.billingMonths, 1)
    assert.equal(res.baseFeeCost, 5)
    assert.equal(res.total, 47)
})

test('Monatsgrenzen: Jahreswechsel und gleicher Monat', () => {
    const a = calculatePeriodCost(r('2023-12-20', 0, 0), r('2024-01-05', 10, 0), price)
    assert.equal(a.billingMonths, 1)
    const b = calculatePeriodCost(r('2024-03-01', 0, 0), r('2024-03-31', 10, 0), price)
    assert.equal(b.billingMonths, 0)
    assert.equal(b.baseFeeCost, 0)
    const c = calculatePeriodCost(r('2023-01-15', 0, 0), r('2024-01-15', 10, 0), price)
    assert.equal(c.billingMonths, 12)
})

test('baseFeeSplit', () => {
    const p100 = { ...price, baseFeeSplit: 100 }
    const p0 = { ...price, baseFeeSplit: 0 }
    const pDefault = { priceHT: 0.3, priceNT: 0.2, baseFee: 10 }
    const from = r('2024-01-01', 0, 0), to = r('2024-03-01', 0, 0)
    assert.equal(calculatePeriodCost(from, to, p100).baseFeeCost, 20)
    assert.equal(calculatePeriodCost(from, to, p0).baseFeeCost, 0)
    assert.equal(calculatePeriodCost(from, to, pDefault).baseFeeCost, 10)
})

test('negative Differenz und fehlende Eingaben ergeben null', () => {
    assert.equal(calculatePeriodCost(r('2024-01-01', 100, 100), r('2024-02-01', 90, 120), price), null)
    assert.equal(calculatePeriodCost(r('2024-01-01', 100, 100), r('2024-02-01', 120, 90), price), null)
    assert.equal(calculatePeriodCost(null, r('2024-02-01', 1, 1), price), null)
    assert.equal(calculatePeriodCost(r('2024-01-01', 1, 1), undefined, price), null)
    assert.equal(calculatePeriodCost(r('2024-01-01', 1, 1), r('2024-02-01', 2, 2), null), null)
})

test('findRelevantPrice', () => {
    const p1 = { id: 1, validFrom: new Date('2023-01-01'), priceHT: 1 }
    const p2 = { id: 2, validFrom: new Date('2024-01-01'), priceHT: 2 }
    const p3 = { id: 3, validFrom: new Date('2025-01-01'), priceHT: 3 }
    const desc = [p3, p2, p1]
    assert.equal(findRelevantPrice(desc, new Date('2024-01-01')).id, 2) // exakter Tag
    assert.equal(findRelevantPrice(desc, new Date('2023-12-31')).id, 1)
    assert.equal(findRelevantPrice(desc, new Date('2030-01-01')).id, 3)
    assert.equal(findRelevantPrice(desc, new Date('2022-12-31')), null) // vor erstem Preis
    assert.equal(findRelevantPrice([p1, p3, p2], new Date('2024-06-01')).id, 2) // unsortiert
    assert.equal(findRelevantPrice([], new Date()), null)
    assert.equal(findRelevantPrice(null, new Date()), null)
})

test('Zählertausch innerhalb der Periode', () => {
    const prev = r('2024-01-01', 1000, 500)
    const change = r('2024-02-01', 5, 2, { meterChange: true, oldFinalHT: 1050, oldFinalNT: 530 })
    const curr = r('2024-03-01', 25, 12)
    // (1050-1000) + (25-5) = 70 ; (530-500) + (12-2) = 40
    const res = calculatePeriodCost(prev, curr, price, [prev, change, curr])
    assert.equal(res.diffHT, 70)
    assert.equal(res.diffNT, 40)
    // ohne between-Readings würde der Rücksprung als ungültig gelten
    assert.equal(calculatePeriodCost(prev, curr, price), null)
})

test('Zählertausch als Endreading und als Startreading', () => {
    const prev = r('2024-01-01', 1000, 500)
    const change = r('2024-02-01', 5, 2, { meterChange: true, oldFinalHT: 1050, oldFinalNT: 530 })
    const end = calculateConsumption(prev, change)
    assert.deepEqual(end, { diffHT: 50, diffNT: 30 })
    const after = calculateConsumption(change, r('2024-03-01', 25, 12))
    assert.deepEqual(after, { diffHT: 20, diffNT: 10 })
})

test('Zählertausch: ungültige Daten', () => {
    const prev = r('2024-01-01', 1000, 500)
    const low = r('2024-02-01', 5, 2, { meterChange: true, oldFinalHT: 900, oldFinalNT: 530 })
    assert.equal(calculateConsumption(prev, low), null)
    const missing = r('2024-02-01', 5, 2, { meterChange: true, oldFinalHT: null, oldFinalNT: null })
    assert.equal(calculateConsumption(prev, missing), null)
})

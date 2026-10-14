import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkReadingNeighbours, findNeighbours, checkSameDayMeterChange, checkAfterBilledPeriod } from '../lib/reading-validation.js'

const prev = { id: 'a', date: '2025-01-01', valueHT: 100, valueNT: 50 }
const next = { id: 'c', date: '2025-03-01', valueHT: 200, valueNT: 90 }

test('normal: zwischen den Nachbarn ist gültig', () => {
    assert.deepEqual(checkReadingNeighbours({ valueHT: 150, valueNT: 70, prev, next }), [])
})

test('Rücklauf gegenüber Vorgänger', () => {
    const w = checkReadingNeighbours({ valueHT: 90, valueNT: 40, prev })
    assert.equal(w.length, 2)
    assert.match(w[0], /niedriger als vorheriger/)
})

test('späterer Nachbar niedriger', () => {
    const w = checkReadingNeighbours({ valueHT: 250, valueNT: 70, prev, next })
    assert.equal(w.length, 1)
    assert.match(w[0], /höher als der spätere/)
})

test('Zählertausch: Endstand alt < Vorgänger wird bemängelt, neue Startwerte nicht', () => {
    const w = checkReadingNeighbours({ valueHT: 0, valueNT: 0, meterChange: true, oldFinalHT: 90, oldFinalNT: 60, prev })
    assert.equal(w.length, 1)
    assert.match(w[0], /Endstand alter Zähler HT/)
    assert.deepEqual(checkReadingNeighbours({ valueHT: 0, valueNT: 0, meterChange: true, oldFinalHT: 120, oldFinalNT: 60, prev }), [])
})

test('Nachfolger mit Zählertausch: Endstand alt zählt', () => {
    const nc = { ...next, valueHT: 0, valueNT: 0, meterChange: true, oldFinalHT: 180, oldFinalNT: 80 }
    assert.deepEqual(checkReadingNeighbours({ valueHT: 170, valueNT: 70, prev, next: nc }), [])
    assert.equal(checkReadingNeighbours({ valueHT: 190, valueNT: 70, prev, next: nc }).length, 1)
})

test('Bearbeiten schließt sich selbst aus der Nachbarsuche aus', () => {
    const all = [prev, { id: 'b', date: '2025-02-01', valueHT: 150, valueNT: 70 }, next]
    const { prev: p, next: n } = findNeighbours(all, '2025-02-01', 'b')
    assert.equal(p.id, 'a')
    assert.equal(n.id, 'c')
    const withSelf = findNeighbours(all, '2025-02-01')
    assert.equal(withSelf.prev.id, 'b')
})

test('gleiche Werte sind erlaubt', () => {
    assert.deepEqual(checkReadingNeighbours({ valueHT: 100, valueNT: 50, prev }), [])
    assert.deepEqual(checkReadingNeighbours({ valueHT: 200, valueNT: 90, prev, next }), [])
})

test('selber Tag: Zählertausch (neu oder bestehend) wird abgelehnt', () => {
    const same = { id: 'x', date: new Date('2025-02-01T00:00:00Z'), meterChange: false }
    assert.match(checkSameDayMeterChange({ date: new Date('2025-02-01'), meterChange: true, others: [same] }), /Zählertausch/)
    assert.ok(checkSameDayMeterChange({ date: new Date('2025-02-01'), meterChange: false, others: [{ ...same, meterChange: true }] }))
})

test('selber Tag ohne Zählertausch oder anderer Tag ist erlaubt', () => {
    const same = { id: 'x', date: new Date('2025-02-01T00:00:00Z'), meterChange: false }
    assert.equal(checkSameDayMeterChange({ date: new Date('2025-02-01'), others: [same] }), null)
    assert.equal(checkSameDayMeterChange({ date: new Date('2025-02-02'), meterChange: true, others: [same] }), null)
})

test('Datum im abgerechneten Zeitraum wird abgelehnt', () => {
    const last = new Date('2025-03-01T00:00:00Z')
    assert.equal(checkAfterBilledPeriod({ date: new Date('2025-03-01'), lastBilledDate: last }), 'Der Zählerstand liegt im bereits abgerechneten Zeitraum (bis 01.03.2025).')
    assert.ok(checkAfterBilledPeriod({ date: new Date('2025-02-01'), lastBilledDate: last }))
    assert.equal(checkAfterBilledPeriod({ date: new Date('2025-03-02'), lastBilledDate: last }), null)
    assert.equal(checkAfterBilledPeriod({ date: new Date('2025-01-01'), lastBilledDate: null }), null)
})

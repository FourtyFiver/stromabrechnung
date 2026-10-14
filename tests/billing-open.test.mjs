import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getOpenReadings } from '../lib/billing.js'

const r = (id, date, billed = false) => ({ id, date: new Date(date), billedAt: billed ? new Date() : null })

test('ohne abgerechneten Stand zählt der älteste Stand nicht als offen', () => {
    const { reference, open } = getOpenReadings([r('b', '2025-02-01'), r('a', '2025-01-01'), r('c', '2025-03-01')])
    assert.equal(reference.id, 'a')
    assert.deepEqual(open.map(x => x.id), ['b', 'c'])
})

test('nach Abrechnung zählt der unabgerechnete Startstand nicht mehr', () => {
    const rs = [r('a', '2025-01-01'), r('b', '2025-02-01', true), r('c', '2025-03-01')]
    assert.deepEqual(getOpenReadings(rs).open.map(x => x.id), ['c'])
})

test('leer / nur ein Stand', () => {
    assert.deepEqual(getOpenReadings([]).open, [])
    assert.deepEqual(getOpenReadings([r('a', '2025-01-01')]).open, [])
})

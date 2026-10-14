import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCsv, formatCsvCell, formatDateDE, CSV_BOM } from '../lib/csv.js'

test('Zahlen mit Dezimalkomma, negative Zahlen nicht präfixiert', () => {
    assert.equal(formatCsvCell(1.5), '1,5')
    assert.equal(formatCsvCell(-2), '-2')
})
test('Injection-Schutz', () => {
    for (const c of ['=1+1', '+1', '-1', '@SUM(A1)']) assert.equal(formatCsvCell(c), "'" + c)
    assert.equal(formatCsvCell('normal'), 'normal')
})
test('Quoting', () => {
    assert.equal(formatCsvCell('a;b'), '"a;b"')
    assert.equal(formatCsvCell('sag "hi"'), '"sag ""hi"""')
    assert.equal(formatCsvCell('x\ny'), '"x\ny"')
    assert.equal(formatCsvCell('=a;b'), '"\'=a;b"')
})
test('null/undefined/boolean', () => {
    assert.equal(formatCsvCell(null), '')
    assert.equal(formatCsvCell(undefined), '')
    assert.equal(formatCsvCell(true), 'ja')
})
test('buildCsv mit BOM und CRLF', () => {
    const out = buildCsv(['A', 'B'], [[1.25, 'x']])
    assert.equal(out, CSV_BOM + 'A;B\r\n1,25;x\r\n')
})
test('formatDateDE', () => {
    assert.equal(formatDateDE(new Date(2025, 2, 5)), '05.03.2025')
    assert.equal(formatDateDE('x'), '')
})

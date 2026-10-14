/**
 * CSV-Builder für deutsches Excel: Semikolon, Dezimalkomma, UTF-8-BOM, CRLF.
 * Zellen, die mit = + - @ (oder Tab/CR) beginnen, werden gegen CSV-Injection
 * mit einem führenden ' entschärft. Zahlen (typeof number) bleiben unverändert.
 */
export const CSV_BOM = '﻿'

export function formatCsvCell(value) {
    if (value === null || value === undefined) return ''
    let s
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return ''
        s = String(value).replace('.', ',')
        return s
    }
    if (typeof value === 'boolean') return value ? 'ja' : 'nein'
    s = String(value)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
    if (/[;"\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
    return s
}

export function buildCsv(headers, rows) {
    const lines = [headers, ...rows].map(row => row.map(formatCsvCell).join(';'))
    return CSV_BOM + lines.join('\r\n') + '\r\n'
}

export function formatDateDE(date) {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    const p = n => String(n).padStart(2, '0')
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

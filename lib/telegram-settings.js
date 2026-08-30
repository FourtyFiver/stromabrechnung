/**
 * Telegram-Chat-ID-Verwaltung (lib/telegram-settings.js)
 *
 * Empfänger-IDs: Textarea "eine ID pro Zeile" wird hier geparst/validiert.
 * - IDs sind numerisch, Gruppen-IDs sind NEGATIV (-1001234567890)
 * - Dedupe, max 10 — verhindert Selbst-Bau einer Spam-Schleife
 * - Test-ID: einzelnes Feld, gleiche Validierung
 */

/** Eine Zeile -> kanonische Chat-ID oder null (invalid). */
export function normalizeTelegramChatId(raw) {
    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    if (!/^-?\d{1,15}$/.test(trimmed)) return null
    // Leading zeros / "-0" vermeiden
    const num = Number(trimmed)
    if (!Number.isSafeInteger(num) || num === 0) return null
    return String(num)
}

/**
 * Textarea-Inhalt -> { ids: string[], invalid: string[] }.
 * Dedupe in Eingabereihenfolge, max 10 IDs (Rest wird als invalid zurückgewiesen).
 */
export function parseTelegramChatIds(text) {
    const lines = (typeof rawText(text) === 'string' ? rawText(text) : '').split('\n')
    const ids = []
    const invalid = []
    for (const line of lines) {
        const t = line.trim()
        if (!t) continue // Leerzeilen erlaubt
        const id = normalizeTelegramChatId(t)
        if (!id) {
            invalid.push(t)
            continue
        }
        if (!ids.includes(id)) ids.push(id)
    }
    if (ids.length > 10) {
        invalid.push(...ids.slice(10))
        return { ids: ids.slice(0, 10), invalid, tooMany: true }
    }
    return { ids, invalid, tooMany: false }
}

/** Speicher-Format: eine ID pro Zeile (Text-Spalte in SQLite). */
export function serializeTelegramChatIds(ids) {
    return Array.isArray(ids) ? ids.join('\n') : null
}

function rawText(v) {
    return typeof v === 'string' ? v : ''
}
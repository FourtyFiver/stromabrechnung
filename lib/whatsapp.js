/**
 * WhatsApp Deep-Link Utilities
 *
 * Baut einen wa.me Click-to-Chat Link mit vorgefülltem Text.
 * Siehe: https://faq.whatsapp.com/5913398998672934/
 *
 * Format-Regeln für wa.me:
 * - Vollständige Nummer im internationalen Format OHNE '+', '00', Klammern, Bindestriche oder Leerzeichen
 * - Läuft auch mit 'whatsapp://' Scheme, aber wa.me (Universal Link) öffnet die App zuverlässig
 *   auf Android, iOS und Desktop (WhatsApp Web/Desktop)
 */

/**
 * Normalisiert eine telefonische Eingabe in eine wa.me-kompatible Ziffernfolge.
 *
 * Akzeptierte Formate:
 * - "+49 170 1234567"  → 491701234567
 * - "0049 170 1234567" → 491701234567
 * - "0170 1234567"     → 491701234567 (deutsche national → 49er Präfix)
 * - "491701234567"     → unverändert
 * - "+43 664 1234567"  → 436641234567 (bereits international ohne führende 0/00)
 *
 * @param {string} raw - Roheingabe aus dem Settings-Formular
 * @returns {string|null} Normalisierte Ziffernfolge oder null bei ungültiger Eingabe
 */
export function normalizeWhatsAppNumber(raw) {
    if (typeof raw !== 'string') return null
    let digits = raw.replace(/\D/g, '')

    if (!digits) return null

    // Intl-Nullen-Präfix entfernen ("0049..." → "49...")
    if (digits.startsWith('00')) {
        digits = digits.replace(/^0+/, '')
    }
    // Deutsche nationale Nummer ("0170..." → "49170...")
    else if (digits.startsWith('0')) {
        digits = '49' + digits.replace(/^0+/, '')
    }
    // Bereits international ("49170..." oder "43...") → unverändert

    // E.164-Sanity: 8 bis 15 Ziffern nach Präfix-Bereinigung
    if (digits.length < 8 || digits.length > 15) return null
    if (!/^[1-9]/.test(digits)) return null

    return digits
}

/**
 * Formatiert eine normalisierte Nummer lesbar für die UI
 * (Gruppen von Ziffern mit Leerzeichen, z.B. "49 170 1234 5678").
 *
 * @param {string} digits - Normalisierte Ziffernfolge (nur Zahlen)
 * @returns {string} Lesbare Darstellung
 */
export function formatWhatsAppNumber(digits) {
    if (!digits) return ''
    return digits.replace(/(\d{2})(\d{3,4})(\d{0,4})(\d{0,4})/, (_, a, b, c, d) =>
        [a, b, c, d].filter(Boolean).join(' ')
    )
}

/**
 * Baut einen wa.me Click-to-Chat Link mit vorgefülltem Text.
 *
 * @param {string} normalizedPhone - Normalisierte Nummer (nur Ziffern, mit Ländercode)
 * @param {string} message - Vorzufüllende Nachricht (wird URL-encoded)
 * @returns {{ ok: boolean, url?: string, error?: string }}
 */
export function buildWhatsAppUrl(normalizedPhone, message) {
    if (!normalizedPhone || !/^\d{8,15}$/.test(normalizedPhone)) {
        return { ok: false, error: 'Ungültige Empfängernummer. Erwartet: internationales Format wie 491701234567.' }
    }
    if (typeof message !== 'string' || !message.trim()) {
        return { ok: false, error: 'Nachricht ist leer.' }
    }

    const encoded = encodeURIComponent(message)
    // api.whatsapp.com statt wa.me: wa.me zerstört Emojis beim Redirect (non-ASCII
    // query params werden zu U+FFFD mangled, live verifiziert 2026-08-30 — der
    // Redirect antwortete mit %EF%BF%BD statt %E2%9A%A1). api.whatsapp.com/send
    // führt denselben Click-to-Chat aus und übergibt den Text intakt.
    const url = `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encoded}&type=phone_number&app_absent=0`

    // Defensive Obergrenze: Browser/WhatsApp verlangen irgendwann zu lange URLs.
    // Unser Report liegt bei ~500 Zeichen — der Guard fängt pathologische Fälle ab.
    if (url.length > 2000) {
        return { ok: false, error: 'Nachricht zu lang für WhatsApp-Link.' }
    }

    return { ok: true, url }
}
/**
 * Custom-Scheme-URL für direktes Öffnen der WhatsApp-App (iOS/Android):
 * whatsapp://send?phone=...&text=... öffnet WhatsApp same-tab — Safari bleibt
 * auf der StromApp stehen (kein Rest-Tab wie bei https-API-Handoff).
 * Falls WhatsApp nicht installiert/kein Handler: Fallback via HTTPS-Link im Dialog.
 */
export function buildWhatsAppAppUrl(normalizedPhone, message) {
    if (!normalizedPhone || !/^\d{8,15}$/.test(normalizedPhone)) {
        return { ok: false, error: 'Ungültige Empfängernummer.' }
    }
    if (typeof message !== 'string' || !message.trim()) {
        return { ok: false, error: 'Nachricht ist leer.' }
    }
    const encoded = encodeURIComponent(message)
    const url = `whatsapp://send?phone=${normalizedPhone}&text=${encoded}`
    if (url.length > 8000) {
        return { ok: false, error: 'Nachricht zu lang für WhatsApp-Link.' }
    }
    return { ok: true, url }
}
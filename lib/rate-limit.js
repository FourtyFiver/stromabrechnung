// In-Memory-Rate-Limiter (Fixed Window pro Schluessel). Reine Logik, Uhr injizierbar.
// Ein Versuch wird per reserve() VOR der (asynchronen) Pruefung gezaehlt, damit
// parallele Anfragen das Limit nicht umgehen; bei Erfolg setzt reset() zurueck.
// Ein Schluessel ist gesperrt, sobald `max` Versuche im aktuellen Fenster erreicht sind.

export function createRateLimiter({ max = 5, windowMs = 15 * 60 * 1000, maxKeys = 10000, now = Date.now } = {}) {
    const entries = new Map() // key -> { count, resetAt }

    function prune(t) {
        for (const [k, e] of entries) {
            if (e.resetAt <= t) entries.delete(k)
        }
    }

    function live(key, t) {
        const e = entries.get(key)
        if (!e) return null
        if (e.resetAt <= t) {
            entries.delete(key)
            return null
        }
        return e
    }

    // Platz fuer einen neuen Schluessel schaffen: abgelaufene, dann den aeltesten
    // NICHT gesperrten Eintrag verdraengen. Gesperrte Schluessel bleiben immer erhalten.
    // false, wenn kein Platz geschaffen werden kann.
    function makeRoom(t) {
        if (entries.size < maxKeys) return true
        prune(t)
        if (entries.size < maxKeys) return true
        for (const [k, e] of entries) {
            if (e.count < max) {
                entries.delete(k)
                return true
            }
        }
        return false
    }

    function blockedUntilFirstExpiry(t) {
        let min = Infinity
        for (const e of entries.values()) min = Math.min(min, e.resetAt)
        return Math.max(1, (Number.isFinite(min) ? min : t + windowMs) - t)
    }

    return {
        // Nur pruefen, nicht zaehlen: { allowed, retryAfterMs }
        check(key) {
            const t = now()
            const e = live(key, t)
            if (e && e.count >= max) return { allowed: false, retryAfterMs: e.resetAt - t }
            return { allowed: true, retryAfterMs: 0 }
        },
        // Prueft und zaehlt den Versuch atomar (synchron). Voller Speicher aus lauter
        // gesperrten Schluesseln: neuer Schluessel gilt als gesperrt.
        reserve(key) {
            const t = now()
            const e = live(key, t)
            if (e) {
                if (e.count >= max) return { allowed: false, retryAfterMs: e.resetAt - t }
                e.count += 1
                return { allowed: true, retryAfterMs: 0 }
            }
            if (!makeRoom(t)) return { allowed: false, retryAfterMs: blockedUntilFirstExpiry(t) }
            entries.set(key, { count: 1, resetAt: t + windowMs })
            return { allowed: true, retryAfterMs: 0 }
        },
        // Eine Reservierung zuruecknehmen (Versuch wurde nicht ausgefuehrt)
        release(key) {
            const e = entries.get(key)
            if (!e) return
            e.count -= 1
            if (e.count <= 0) entries.delete(key)
        },
        // Fehlversuch zaehlen (ohne vorherige Reservierung)
        fail(key) {
            const t = now()
            const e = live(key, t)
            if (e) {
                e.count += 1
                return
            }
            if (!makeRoom(t)) return
            entries.set(key, { count: 1, resetAt: t + windowMs })
        },
        reset(key) {
            entries.delete(key)
        },
        size() {
            return entries.size
        },
    }
}

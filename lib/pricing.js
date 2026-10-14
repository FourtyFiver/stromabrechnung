export const NO_PRICE_ERROR = 'Für den Zeitraum ist kein gültiger Strompreis hinterlegt – Gültig-ab-Datum prüfen.'

/**
 * Find the relevant price configuration for a given date.
 *
 * Returns the price with the latest validFrom that is <= targetDate
 * (independent of the order of allPrices). There is deliberately NO
 * fallback to the oldest price: if the date lies before the first
 * validFrom, null is returned and callers must show an error.
 *
 * @param {Array} allPrices - Price configs (any order)
 * @param {Date} targetDate - The date to find the price for
 * @returns {Object|null} The relevant price config, or null if none found
 */
export function findRelevantPrice(allPrices, targetDate) {
    if (!allPrices || allPrices.length === 0 || !targetDate) return null
    const target = new Date(targetDate).getTime()
    if (isNaN(target)) return null

    let best = null
    let bestTime = -Infinity
    for (const p of allPrices) {
        const t = new Date(p.validFrom).getTime()
        if (!isNaN(t) && t <= target && t > bestTime) {
            best = p
            bestTime = t
        }
    }
    return best
}

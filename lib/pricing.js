/**
 * Find the relevant price configuration for a given date.
 *
 * Prices are sorted by validFrom descending, so the first match
 * where validFrom <= targetDate is the applicable tariff.
 *
 * @param {Array} allPrices - Price configs sorted by validFrom desc
 * @param {Date} targetDate - The date to find the price for
 * @returns {Object|null} The relevant price config, or null if none found
 */
export function findRelevantPrice(allPrices, targetDate) {
    if (!allPrices || allPrices.length === 0) return null
    return allPrices.find(p => p.validFrom <= targetDate) || allPrices[allPrices.length - 1]
}
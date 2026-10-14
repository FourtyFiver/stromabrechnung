/**
 * Berechnet den Verbrauch zwischen zwei Zählerständen, optional über
 * Zählertausch(e) hinweg.
 *
 * Ein Reading mit meterChange=true enthält in valueHT/valueNT den STARTWERT des
 * neuen Zählers und in oldFinalHT/oldFinalNT den Endstand des alten Zählers.
 * Verbrauch je Segment: (oldFinal - Vorwert) + (aktuell - Startwert neu).
 *
 * @param {Object} prev - Startreading { date, valueHT, valueNT, ... }
 * @param {Object} curr - Endreading
 * @param {Array} [between=[]] - Weitere Readings (beliebige Reihenfolge); nur solche
 *                               mit prev.date < date < curr.date werden berücksichtigt.
 * @returns {{diffHT:number, diffNT:number}|null} null bei ungültigen Daten
 */
export function calculateConsumption(prev, curr, between = []) {
    if (!prev || !curr) return null
    const prevTime = new Date(prev.date).getTime()
    const currTime = new Date(curr.date).getTime()

    const chain = (between || [])
        .filter(r => {
            const t = new Date(r.date).getTime()
            return t > prevTime && t < currTime
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    chain.push(curr)

    let startHT = prev.valueHT
    let startNT = prev.valueNT
    let diffHT = 0
    let diffNT = 0

    for (const r of chain) {
        let endHT = r.valueHT
        let endNT = r.valueNT
        if (r.meterChange) {
            if (typeof r.oldFinalHT !== 'number' || typeof r.oldFinalNT !== 'number') return null
            endHT = r.oldFinalHT
            endNT = r.oldFinalNT
        }
        const segHT = endHT - startHT
        const segNT = endNT - startNT
        if (!(segHT >= 0) || !(segNT >= 0)) return null
        diffHT += segHT
        diffNT += segNT
        startHT = r.valueHT
        startNT = r.valueNT
    }

    return { diffHT, diffNT }
}


/**
 * Calculates the cost for a period between two readings based on a price configuration.
 *
 * Returns null for invalid input (missing data, negative consumption) instead of
 * silently returning zero-values. Callers should check for null and show an error.
 *
 * @param {Object} prevReading - The previous reading object { date, valueHT, valueNT }
 * @param {Object} currReading - The current reading object { date, valueHT, valueNT }
 * @param {Object} priceConfig - The price configuration object { priceHT, priceNT, baseFee, baseFeeSplit }
 * @param {Array} [between=[]] - Optional readings between prev and curr (needed when a meter change lies inside the period)
 * @returns {Object|null} - The calculation result, or null if inputs are invalid
 */
export function calculatePeriodCost(prevReading, currReading, priceConfig, between = []) {
    if (!prevReading || !currReading || !priceConfig) {
        return null
    }

    const prevDate = new Date(prevReading.date)
    const currDate = new Date(currReading.date)

    // Consumption incl. possible meter changes. Negative consumption means
    // meter readings went backwards — reject this (null)
    const consumption = calculateConsumption(prevReading, currReading, between)
    if (!consumption) {
        return null
    }
    const { diffHT, diffNT } = consumption

    // Month-based base fee calculation (Strictly preserving existing logic)
    // (Year Diff * 12) + Month Diff
    const diffMonths = (currDate.getFullYear() - prevDate.getFullYear()) * 12 + (currDate.getMonth() - prevDate.getMonth())
    const billingMonths = Math.max(0, diffMonths)

    const split = priceConfig.baseFeeSplit !== undefined ? priceConfig.baseFeeSplit : 50.0
    const baseFeeCost = (priceConfig.baseFee * billingMonths) * (split / 100)

    const energyCost = (diffHT * priceConfig.priceHT) + (diffNT * priceConfig.priceNT)
    const totalCost = energyCost + baseFeeCost

    return {
        total: parseFloat(totalCost.toFixed(2)),
        energyCost: parseFloat(energyCost.toFixed(2)),
        baseFeeCost: parseFloat(baseFeeCost.toFixed(2)),
        billingMonths,
        diffHT: parseFloat(diffHT.toFixed(1)),
        diffNT: parseFloat(diffNT.toFixed(1)),
        details: {
            priceHT: priceConfig.priceHT,
            priceNT: priceConfig.priceNT,
            baseFee: priceConfig.baseFee,
            baseFeeSplit: split
        }
    }
}

/**
 * Bestimmt Bezugsstand und offene Stände. Bezug = letzter abgerechneter Stand,
 * sonst der älteste Stand (dieser wird nie abgerechnet, nur Startpunkt).
 * Offen = unabgerechnete Stände nach dem Bezugsstand.
 *
 * @param {Array} readings - beliebige Reihenfolge
 * @returns {{reference:Object|null, open:Array}} open aufsteigend sortiert
 */
export function getOpenReadings(readings) {
    const rs = [...(readings || [])].sort((a, b) => new Date(a.date) - new Date(b.date))
    const lastBilled = [...rs].reverse().find(r => r.billedAt) || null
    const reference = lastBilled || rs[0] || null
    if (!reference) return { reference: null, open: [] }
    const refTime = new Date(reference.date).getTime()
    const open = rs.filter(r => !r.billedAt && new Date(r.date).getTime() > refTime)
    return { reference, open }
}

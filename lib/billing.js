/**
 * Calculates the cost for a period between two readings based on a price configuration.
 * 
 * @param {Object} prevReading - The previous reading object { date, valueHT, valueNT }
 * @param {Object} currReading - The current reading object { date, valueHT, valueNT }
 * @param {Object} priceConfig - The price configuration object { priceHT, priceNT, baseFee, baseFeeSplit }
 * @returns {Object} - The calculation result { total, energyCost, baseFeeCost, billingMonths, diffHT, diffNT, details }
 */
export function calculatePeriodCost(prevReading, currReading, priceConfig) {
    if (!prevReading || !currReading || !priceConfig) {
        return {
            total: 0,
            energyCost: 0,
            baseFeeCost: 0,
            billingMonths: 0,
            diffHT: 0,
            diffNT: 0,
            details: null
        }
    }

    const prevDate = new Date(prevReading.date)
    const currDate = new Date(currReading.date)

    const diffHT = currReading.valueHT - prevReading.valueHT
    const diffNT = currReading.valueNT - prevReading.valueNT

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

/**
 * Report-Nachrichtentext (kanalübergreifend)
 *
 * Wird von Telegram-Versand, WhatsApp-Vorschau und WhatsApp-Link verwendet,
 * damit alle Kanäle exakt denselben Text nutzen.
 */

const BOLD = '*'

/**
 * Formatiert den Abrechnungs-Report als Text.
 *
 * @param {Object} args
 * @param {Object} args.fromReading - { date, valueHT, valueNT }
 * @param {Object} args.toReading   - { date, valueHT, valueNT }
 * @param {Object} args.calc        - Ergebnis von calculatePeriodCost()
 * @param {Object} args.price       - relevante PriceConfig
 * @returns {string} Formatierter Nachrichtentext
 */
export function formatReportMessage({ fromReading, toReading, calc, price }) {
    const { total, energyCost, baseFeeCost, billingMonths, diffHT, diffNT } = calc
    const split = price.baseFeeSplit !== undefined ? price.baseFeeSplit : 50.0

    return `⚡ ${BOLD}Stromabrechnung Report${BOLD} ⚡

📅 ${BOLD}Zeitraum:${BOLD}
${fromReading.date.toLocaleDateString('de-DE')} ➡️ ${toReading.date.toLocaleDateString('de-DE')} (${billingMonths} Monate)

📊 ${BOLD}Verbrauch:${BOLD}
HT: ${diffHT.toFixed(1)} kWh
NT: ${diffNT.toFixed(1)} kWh

💰 ${BOLD}Zu zahlender Betrag:${BOLD}
${BOLD}${total} €${BOLD}
_(Arbeit: ${energyCost.toFixed(2)}€ | Grund: ${baseFeeCost.toFixed(2)}€)_
_(Basis: ${price.priceHT}€/${price.priceNT}€ | ${price.baseFee}€ @ ${split}%)_

Zählerstand neu: HT ${toReading.valueHT} / NT ${toReading.valueNT}`
}
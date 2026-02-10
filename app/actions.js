'use server'

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { calculatePeriodCost } from "@/lib/billing"
import { getAvailableBillingPeriods, validateBillingPeriod, createBillPeriod, getBillingHistory } from "@/lib/billing-status"
import { z } from "zod"

const PriceConfigSchema = z.object({
    priceHT: z.coerce.number().min(0),
    priceNT: z.coerce.number().min(0),
    baseFee: z.coerce.number().min(0).default(0),
    baseFeeSplit: z.coerce.number().min(0).max(100).default(50),
    validFrom: z.coerce.date().default(() => new Date())
})

export async function addPriceConfig(formData) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { success: false, error: 'Nicht authentifiziert' }
    }

    const rawData = {
        priceHT: formData.get("priceHT"),
        priceNT: formData.get("priceNT"),
        baseFee: formData.get("baseFee"),
        baseFeeSplit: formData.get("baseFeeSplit"),
        validFrom: formData.get("validFrom") || undefined // undefined triggers default
    }

    const validation = PriceConfigSchema.safeParse(rawData)

    if (!validation.success) {
        console.error("Validation failed", validation.error.flatten())
        // In a real app we might return the errors to the form, 
        // but for now we basically ignore invalid submits or throw. 
        // Since this is a server action called by a form, we'll just throw so it doesn't save bad data.
        throw new Error("Validation failed: " + JSON.stringify(validation.error.flatten().fieldErrors))
    }

    const { priceHT, priceNT, baseFee, baseFeeSplit, validFrom } = validation.data


    await prisma.priceConfig.create({
        data: {
            priceHT,
            priceNT,
            baseFee,
            baseFeeSplit,
            validFrom
        }
    })

    revalidatePath("/settings")
    revalidatePath("/")
    return { success: true }
}

export async function addReading(formData) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { success: false, error: 'Nicht authentifiziert' }
    }

    const valueHT = parseFloat(formData.get('valueHT'))
    const valueNT = parseFloat(formData.get('valueNT'))
    const date = new Date(formData.get('date'))
    const comment = formData.get('comment')

    await prisma.reading.create({
        data: {
            date,
            valueHT,
            valueNT,
            comment
        }
    })

    revalidatePath('/')
    revalidatePath('/readings')
    return { success: true }
}

export async function deleteReading(id) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { success: false, error: 'Nicht authentifiziert' }
    }

    try {
        await prisma.reading.delete({
            where: { id }
        })

        revalidatePath('/')
        revalidatePath('/readings')
        return { success: true }
    } catch (e) {
        console.error("Delete error:", e)
        return { success: false, error: 'Fehler beim Löschen' }
    }
}

export async function sendTelegramReport() {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Nicht eingeloggt' }

    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!token || !chatId) {
        return { success: false, error: 'Telegram nicht konfiguriert (.env prüfen)' }
    }

    // 1. Fetch Data
    const readings = await prisma.reading.findMany({
        orderBy: { date: 'desc' },
        take: 2 // We need last 2 to calc diff
    })

    if (readings.length < 2) {
        return { success: false, error: 'Zu wenige Zählerstände für einen Report.' }
    }

    const curr = readings[0]
    const prev = readings[1]

    // 2. Fetch Pricing
    // Find price valid for current reading date
    const allPrices = await prisma.priceConfig.findMany({
        orderBy: { validFrom: 'desc' }
    })
    const relevantPrice = allPrices.find(p => p.validFrom <= curr.date) || allPrices[allPrices.length - 1]

    if (!relevantPrice) return { success: false, error: 'Kein Strompreis gefunden.' }


    // 3. Calculate using shared logic
    const result = calculatePeriodCost(prev, curr, relevantPrice)

    if (!result) return { success: false, error: 'Fehler bei der Berechnung.' }

    const {
        total: totalCost,
        energyCost,
        baseFeeCost,
        billingMonths,
        diffHT,
        diffNT
    } = result

    const split = relevantPrice.baseFeeSplit !== undefined ? relevantPrice.baseFeeSplit : 50.0

    // 4. Format Message
    const message = `
⚡ *Stromabrechnung Report* ⚡

📅 *Zeitraum:*
${prev.date.toLocaleDateString('de-DE')} ➡️ ${curr.date.toLocaleDateString('de-DE')} (${billingMonths} Monate)

📊 *Verbrauch:*
HT: ${diffHT.toFixed(1)} kWh
NT: ${diffNT.toFixed(1)} kWh

💰 *Zu zahlender Betrag:*
*${totalCost} €*
_(Arbeit: ${energyCost.toFixed(2)}€ | Grund: ${baseFeeCost.toFixed(2)}€)_
_(Basis: ${relevantPrice.priceHT}€/${relevantPrice.priceNT}€ | ${relevantPrice.baseFee}€ @ ${split}%)_

Zählerstand neu: HT ${curr.valueHT} / NT ${curr.valueNT}
`.trim()

    // 5. Send to Telegram
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        })

        const data = await res.json()
        if (!data.ok) {
            console.error('Telegram API Error:', data)
            return { success: false, error: data.description }
        }

        return { success: true }
    } catch (e) {
        console.error('Telegram Fetch Error:', e)
        return { success: false, error: 'Verbindungsfehler zu Telegram' }
    }
}

/**
 * Hole verfügbare Abrechnungs-Perioden für die UI
 */
export async function getAvailableBillingPeriodsAction() {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Nicht eingeloggt' }

    try {
        const result = await getAvailableBillingPeriods()
        // Serialize dates for client
        return {
            success: true,
            data: {
                periods: result.periods.map(p => ({
                    ...p,
                    fromDate: p.fromDate.toISOString(),
                    toDate: p.toDate.toISOString()
                })),
                unbilledReadings: result.unbilledReadings.map(r => ({
                    id: r.id,
                    date: r.date.toISOString(),
                    valueHT: r.valueHT,
                    valueNT: r.valueNT
                })),
                fromReading: result.fromReading ? {
                    id: result.fromReading.id,
                    date: result.fromReading.date.toISOString(),
                    valueHT: result.fromReading.valueHT,
                    valueNT: result.fromReading.valueNT
                } : null,
                message: result.message
            }
        }
    } catch (e) {
        console.error('getAvailableBillingPeriodsAction error:', e)
        return { success: false, error: 'Fehler beim Laden der Perioden.' }
    }
}

/**
 * Sende einen benutzerdefinierten Telegram-Report mit Billing-Tracking
 */
export async function sendCustomTelegramReport(fromId, toId) {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Nicht eingeloggt' }

    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!token || !chatId) {
        return { success: false, error: 'Telegram nicht konfiguriert (.env prüfen)' }
    }

    // 1. Validate period
    const validation = await validateBillingPeriod(fromId, toId)
    if (!validation.valid) {
        return { success: false, error: validation.error }
    }

    const { fromReading, toReading } = validation

    // 2. Fetch pricing
    const allPrices = await prisma.priceConfig.findMany({
        orderBy: { validFrom: 'desc' }
    })
    const relevantPrice = allPrices.find(p => p.validFrom <= toReading.date) || allPrices[allPrices.length - 1]

    if (!relevantPrice) {
        return { success: false, error: 'Kein Strompreis gefunden.' }
    }

    // 3. Calculate
    const result = calculatePeriodCost(fromReading, toReading, relevantPrice)
    if (!result) {
        return { success: false, error: 'Fehler bei der Berechnung.' }
    }

    const { total: totalCost, energyCost, baseFeeCost, billingMonths, diffHT, diffNT } = result
    const split = relevantPrice.baseFeeSplit !== undefined ? relevantPrice.baseFeeSplit : 50.0

    // 4. Format message
    const message = `⚡ *Stromabrechnung Report* ⚡

📅 *Zeitraum:*
${fromReading.date.toLocaleDateString('de-DE')} ➡️ ${toReading.date.toLocaleDateString('de-DE')} (${billingMonths} Monate)

📊 *Verbrauch:*
HT: ${diffHT.toFixed(1)} kWh
NT: ${diffNT.toFixed(1)} kWh

💰 *Zu zahlender Betrag:*
*${totalCost} €*
_(Arbeit: ${energyCost.toFixed(2)}€ | Grund: ${baseFeeCost.toFixed(2)}€)_
_(Basis: ${relevantPrice.priceHT}€/${relevantPrice.priceNT}€ | ${relevantPrice.baseFee}€ @ ${split}%)_

Zählerstand neu: HT ${toReading.valueHT} / NT ${toReading.valueNT}`

    // 5. Send to Telegram
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        })

        const data = await res.json()
        if (!data.ok) {
            console.error('Telegram API Error:', data)
            return { success: false, error: data.description }
        }
    } catch (e) {
        console.error('Telegram Fetch Error:', e)
        return { success: false, error: 'Verbindungsfehler zu Telegram' }
    }

    // 6. Create BillPeriod & mark readings as billed
    try {
        await createBillPeriod({
            fromId,
            toId,
            totalCost,
            energyCost,
            baseFeeCost,
            billingMonths,
            diffHT,
            diffNT,
            sentVia: 'telegram'
        })
    } catch (e) {
        console.error('createBillPeriod error:', e)
        // Report was sent but billing tracking failed — still report success with warning
        return { success: true, warning: 'Report gesendet, aber Billing-Tracking fehlgeschlagen.' }
    }

    revalidatePath('/')
    revalidatePath('/billing-history')

    return { success: true }
}

/**
 * Hole Abrechnungs-Historie für die UI
 */
export async function getBillingHistoryAction() {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Nicht eingeloggt' }

    try {
        const history = await getBillingHistory()
        return {
            success: true,
            data: history.map(bp => ({
                id: bp.id,
                fromDate: bp.fromDate.toISOString(),
                toDate: bp.toDate.toISOString(),
                totalCost: bp.totalCost,
                energyCost: bp.energyCost,
                baseFeeCost: bp.baseFeeCost,
                billingMonths: bp.billingMonths,
                diffHT: bp.diffHT,
                diffNT: bp.diffNT,
                sentAt: bp.sentAt.toISOString(),
                sentVia: bp.sentVia
            }))
        }
    } catch (e) {
        console.error('getBillingHistoryAction error:', e)
        return { success: false, error: 'Fehler beim Laden der Historie.' }
    }
}

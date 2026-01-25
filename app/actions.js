'use server'

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function addPriceConfig(formData) {
    const priceHT = parseFloat(formData.get("priceHT"))
    const priceNT = parseFloat(formData.get("priceNT"))
    const baseFee = parseFloat(formData.get("baseFee")) || 0
    const baseFeeSplit = parseFloat(formData.get("baseFeeSplit")) || 50

    await prisma.priceConfig.create({
        data: {
            priceHT,
            priceNT,
            baseFee,
            baseFeeSplit,
            validFrom: new Date()
        }
    })

    revalidatePath("/settings")
    revalidatePath("/")
}

export async function addReading(formData) {
    const session = await getServerSession(authOptions)
    if (!session) {
        throw new Error('Not authenticated')
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
    redirect('/readings')
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

    // 3. Calculate
    const diffHT = curr.valueHT - prev.valueHT
    const diffNT = curr.valueNT - prev.valueNT

    // Calculate time difference for base fee (Month-based)
    const diffMonths = (curr.date.getFullYear() - prev.date.getFullYear()) * 12 + (curr.date.getMonth() - prev.date.getMonth());

    // Fallback if 0 (same month), maybe user wants 0 or 1?
    // Requirement says "how many months have passed".
    // 1. Jan -> 15. Jan = 0 months
    // 31. Jan -> 1. Feb = 1 month
    const billingMonths = Math.max(0, diffMonths);

    // Calculate costs
    const energyCost = (diffHT * relevantPrice.priceHT) + (diffNT * relevantPrice.priceNT)

    // Calculate Base Fee Share
    const split = relevantPrice.baseFeeSplit !== undefined ? relevantPrice.baseFeeSplit : 50.0
    const baseFeeCost = (relevantPrice.baseFee * billingMonths) * (split / 100)

    const totalCost = (energyCost + baseFeeCost).toFixed(2)

    // 4. Format Message
    const message = `
⚡ *Stromabrechnung Report* ⚡

📅 *Zeitraum:*
${prev.date.toLocaleDateString('de-DE')} ➡️ ${curr.date.toLocaleDateString('de-DE')} (${billingMonths} Monate)

📊 *Verbrauch:*
HT: ${diffHT.toFixed(1)} kWh
NT: ${diffNT.toFixed(1)} kWh

💰 *Kosten:*
*${totalCost} €*
_(Arbeit: ${energyCost.toFixed(2)}€ | Grund: ${baseFeeCost.toFixed(2)}€)_
_(Basis: ${relevantPrice.priceHT}€/${relevantPrice.priceNT}€ | ${relevantPrice.baseFee}€ @ ${split}%)_

Zählerstand neu: ${curr.valueHT}/${curr.valueNT}
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

'use server'

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { calculatePeriodCost } from "@/lib/billing"
import { getAvailableBillingPeriods, validateBillingPeriod, createBillPeriod, getBillingHistory } from "@/lib/billing-status"
import { findRelevantPrice } from "@/lib/pricing"
import { sendTelegramMessage } from "@/lib/telegram"
import { getAppSettings, updateAppSettings } from "@/lib/app-settings"
import { normalizeWhatsAppNumber, formatWhatsAppNumber, buildWhatsAppUrl } from "@/lib/whatsapp"
import { formatReportMessage } from "@/lib/report-message"
import { z } from "zod"

const PriceConfigSchema = z.object({
    priceHT: z.coerce.number().min(0),
    priceNT: z.coerce.number().min(0),
    baseFee: z.coerce.number().min(0).default(0),
    baseFeeSplit: z.coerce.number().min(0).max(100).default(50),
    validFrom: z.coerce.date().default(() => new Date())
})

const ReadingSchema = z.object({
    date: z.coerce.date(),
    valueHT: z.coerce.number().min(0, 'Zählerstand HT darf nicht negativ sein'),
    valueNT: z.coerce.number().min(0, 'Zählerstand NT darf nicht negativ sein'),
    comment: z.string().max(500).optional().default('')
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
        const firstError = Object.values(validation.error.flatten().fieldErrors).flat()[0]
        return { success: false, error: firstError || 'Ungültige Eingabe' }
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

    const rawData = {
        date: formData.get('date'),
        valueHT: formData.get('valueHT'),
        valueNT: formData.get('valueNT'),
        comment: formData.get('comment') || ''
    }

    const validation = ReadingSchema.safeParse(rawData)
    if (!validation.success) {
        const firstError = Object.values(validation.error.flatten().fieldErrors).flat()[0]
        return { success: false, error: firstError || 'Ungültige Eingabe' }
    }

    const { date, valueHT, valueNT, comment } = validation.data

    // Check for meter rollback: new reading should not be lower than the last one
    const lastReading = await prisma.reading.findFirst({
        orderBy: { date: 'desc' }
    })
    if (lastReading) {
        const warnings = []
        if (valueHT < lastReading.valueHT) {
            warnings.push(`HT ${valueHT.toLocaleString('de-DE')} ist niedriger als letzter Stand (${lastReading.valueHT.toLocaleString('de-DE')} kWh)`)
        }
        if (valueNT < lastReading.valueNT) {
            warnings.push(`NT ${valueNT.toLocaleString('de-DE')} ist niedriger als letzter Stand (${lastReading.valueNT.toLocaleString('de-DE')} kWh)`)
        }
        if (warnings.length > 0) {
            return {
                success: false,
                error: `Zählerstand-Rücklauf erkannt: ${warnings.join('; ')}. Bitte überprüfen Sie die Eingabe.`
            }
        }
    }

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

    const reading = await prisma.reading.findUnique({ where: { id } })
    if (!reading) {
        return { success: false, error: 'Zählerstand nicht gefunden' }
    }
    if (reading.billedAt) {
        return { success: false, error: 'Abgerechnete Zählerstände können nicht gelöscht werden.' }
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
 * Baut den Report-Nachrichtentext für eine Periode (Simulation / Vorschau).
 * Kein Senden, kein Booking — rein lesend. Nutzt dieselbe Formatierung wie
 * der Telegram-Versand, damit die Simulation exakt das zeigt, was später rausgeht.
 */
async function buildReportPayload(fromId, toId) {
    const validation = await validateBillingPeriod(fromId, toId)
    if (!validation.valid) {
        return { success: false, error: validation.error }
    }

    const { fromReading, toReading } = validation

    const allPrices = await prisma.priceConfig.findMany({
        orderBy: { validFrom: 'desc' }
    })
    const relevantPrice = findRelevantPrice(allPrices, toReading.date)

    if (!relevantPrice) {
        return { success: false, error: 'Kein Strompreis gefunden.' }
    }

    const calc = calculatePeriodCost(fromReading, toReading, relevantPrice)
    if (!calc) {
        return { success: false, error: 'Fehler bei der Berechnung.' }
    }

    return {
        success: true,
        fromReading,
        toReading,
        price: relevantPrice,
        calc,
        message: formatReportMessage({ fromReading, toReading, calc, price: relevantPrice })
    }
}

/**
 * Report-Vorschau ("Simulation"): baut den Nachrichtentext für den gewählten
 * Zeitraum, ohne zu senden oder zu buchen. Zeigt zusätzlich, wohin der
 * WhatsApp-Versand gehen würde.
 */
export async function getReportPreviewAction(fromId, toId) {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Nicht eingeloggt' }

    const payload = await buildReportPayload(fromId, toId)
    if (!payload.success) return payload

    const settings = await getAppSettings()
    const rawNumber = settings?.whatsappNumber || ''
    const normalized = rawNumber ? normalizeWhatsAppNumber(rawNumber) : null

    return {
        success: true,
        data: {
            message: payload.message,
            whatsapp: {
                configured: Boolean(normalized),
                formattedNumber: normalized ? formatWhatsAppNumber(normalized) : null,
                warning: rawNumber && !normalized
                    ? 'Gespeicherte Nummer ist kein gültiges Format (z. B. +49 oder 0170…). Bitte in den Einstellungen korrigieren.'
                    : null
            }
        }
    }
}

/**
 * Sende einen benutzerdefinierten Telegram-Report mit Billing-Tracking
 */
export async function sendCustomTelegramReport(fromId, toId) {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Nicht eingeloggt' }

    const payload = await buildReportPayload(fromId, toId)
    if (!payload.success) return payload

    const { fromReading, toReading, calc, message } = payload
    const { total: totalCost, energyCost, baseFeeCost, billingMonths, diffHT, diffNT } = calc

    // 5. Send to Telegram
    const sendResult = await sendTelegramMessage(message)
    if (!sendResult.success) {
        return sendResult
    }

    // 6. Create BillPeriod & mark readings as billed
    // Pass pre-fetched readings to avoid redundant DB queries
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
            sentVia: 'telegram',
            fromReading,
            toReading
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
 * WhatsApp-Versand per Click-to-Chat (wa.me):
 * Bucht die Periode (sentVia='whatsapp') und liefert den fertigen
 * wa.me-Link zurück. Der Client öffnet ihn — WhatsApp erscheint mit
 * vorgefülltem Text; der User tippt nur noch "Senden".
 */
export async function sendWhatsAppReportAction(fromId, toId) {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Nicht eingeloggt' }

    const payload = await buildReportPayload(fromId, toId)
    if (!payload.success) return payload

    const { fromReading, toReading, price, calc, message } = payload
    const settings = await getAppSettings()
    const rawNumber = settings?.whatsappNumber || ''
    const normalized = rawNumber ? normalizeWhatsAppNumber(rawNumber) : null

    if (!normalized) {
        return {
            success: false,
            error: rawNumber
                ? 'Gespeicherte Nummer ist ungültig. Bitte in den Einstellungen prüfen (z. B. +49 170 1234567).'
                : 'Keine WhatsApp-Empfängernummer gesetzt. Bitte in den Einstellungen hinterlegen.'
        }
    }

    const urlResult = buildWhatsAppUrl(normalized, message)
    if (!urlResult.ok) {
        return { success: false, error: urlResult.error }
    }

    // Booking VOR dem Öffnen des Links: Der Klick öffnet WhatsApp, aber ob der
    // User dort wirklich "Senden" tippt, sieht die App nicht. Ohne Booking
    // hätten wir doppelte Risiko-Läufe (Doppel-Abrechnung). Bewusst so.
    try {
        await createBillPeriod({
            fromId,
            toId,
            totalCost: calc.total,
            energyCost: calc.energyCost,
            baseFeeCost: calc.baseFeeCost,
            billingMonths: calc.billingMonths,
            diffHT: calc.diffHT,
            diffNT: calc.diffNT,
            sentVia: 'whatsapp',
            fromReading,
            toReading
        })
    } catch (e) {
        console.error('createBillPeriod error:', e)
        return { success: false, error: 'Berechnung OK, aber Billing-Tracking fehlgeschlagen.' }
    }

    revalidatePath('/')
    revalidatePath('/billing-history')

    return {
        success: true,
        data: {
            whatsappUrl: urlResult.url,
            formattedNumber: formatWhatsAppNumber(normalized)
        }
    }
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
                sentVia: bp.sentVia,
                pdfGenerated: bp.pdfGenerated
            }))
        }
    } catch (e) {
        console.error('getBillingHistoryAction error:', e)
        return { success: false, error: 'Fehler beim Laden der Historie.' }
    }
}

/**
 * Mark a BillPeriod as having had its PDF generated
 */
export async function markPdfGenerated(billPeriodId) {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Nicht eingeloggt' }

    try {
        await prisma.billPeriod.update({
            where: { id: billPeriodId },
            data: { pdfGenerated: true }
        })
        revalidatePath('/billing-history')
        return { success: true }
    } catch (e) {
        console.error('markPdfGenerated error:', e)
        return { success: false, error: 'Fehler beim Aktualisieren.' }
    }
}

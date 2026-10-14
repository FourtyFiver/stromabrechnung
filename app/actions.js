'use server'

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { calculatePeriodCost } from "@/lib/billing"
import { getAvailableBillingPeriods, validateBillingPeriod, createBillPeriod, getBillingHistory } from "@/lib/billing-status"
import { findRelevantPrice, NO_PRICE_ERROR } from "@/lib/pricing"
import { sendTelegramMessage } from "@/lib/telegram"
import { parseTelegramChatIds } from "@/lib/telegram-settings"
import { getAppSettings, updateAppSettings } from "@/lib/app-settings"
import { normalizeWhatsAppNumber, formatWhatsAppNumber, buildWhatsAppUrl, buildWhatsAppAppUrl } from "@/lib/whatsapp"
import { formatReportMessage } from "@/lib/report-message"
import { checkReadingNeighbours, checkSameDayMeterChange, checkAfterBilledPeriod } from "@/lib/reading-validation"
import { snapshotReading } from "@/lib/reading-history"
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
    valueHT: z.coerce.number({ message: 'Zählerstand HT muss angegeben werden' }).min(0, 'Zählerstand HT darf nicht negativ sein'),
    valueNT: z.coerce.number({ message: 'Zählerstand NT muss angegeben werden' }).min(0, 'Zählerstand NT darf nicht negativ sein'),
    comment: z.string().max(500).optional().default(''),
    meterChange: z.boolean().default(false),
    oldFinalHT: z.coerce.number().min(0, 'Endstand alter Zähler (HT) darf nicht negativ sein').optional(),
    oldFinalNT: z.coerce.number().min(0, 'Endstand alter Zähler (NT) darf nicht negativ sein').optional()
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

// z.coerce.number() macht '' zu 0 – leere Eingaben müssen aber abgelehnt werden
const emptyToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v)

function parseReadingForm(formData) {
    const validation = ReadingSchema.safeParse({
        date: formData.get('date'),
        valueHT: emptyToUndefined(formData.get('valueHT')),
        valueNT: emptyToUndefined(formData.get('valueNT')),
        comment: formData.get('comment') || '',
        meterChange: formData.get('meterChange') === 'on',
        oldFinalHT: formData.get('oldFinalHT') || undefined,
        oldFinalNT: formData.get('oldFinalNT') || undefined
    })
    if (!validation.success) {
        const firstError = Object.values(validation.error.flatten().fieldErrors).flat()[0]
        return { error: firstError || 'Ungültige Eingabe' }
    }
    const data = validation.data
    if (data.meterChange && (data.oldFinalHT === undefined || data.oldFinalNT === undefined)) {
        return { error: 'Bei einem Zählertausch müssen die Endstände des alten Zählers (HT und NT) angegeben werden.' }
    }
    return { data }
}

// Rücklauf-Prüfung gegen die Nachbarn am Datum (nicht nur gegen den neuesten Stand);
// excludeId schließt beim Bearbeiten den Eintrag selbst aus.
async function checkAgainstNeighbours(data, excludeId = null) {
    const notSelf = excludeId ? { id: { not: excludeId } } : {}
    const [prev, next] = await Promise.all([
        prisma.reading.findFirst({ where: { ...notSelf, date: { lte: data.date } }, orderBy: [{ date: 'desc' }, { id: 'desc' }] }),
        prisma.reading.findFirst({ where: { ...notSelf, date: { gt: data.date } }, orderBy: [{ date: 'asc' }, { id: 'asc' }] })
    ])
    const warnings = checkReadingNeighbours({ ...data, prev, next })
    if (warnings.length > 0) {
        return `Zählerstand-Rücklauf erkannt: ${warnings.join('; ')}. Bitte überprüfen Sie die Eingabe.`
    }
    return null
}

// Datumsregeln: kein Stand am selben Tag neben einem Zählertausch; kein Stand im
// bereits abgerechneten Zeitraum. excludeId schließt den bearbeiteten Eintrag aus.
async function checkDateRules(data, excludeId = null) {
    const notSelf = excludeId ? { id: { not: excludeId } } : {}
    const dayStart = new Date(Date.UTC(data.date.getUTCFullYear(), data.date.getUTCMonth(), data.date.getUTCDate()))
    const dayEnd = new Date(dayStart.getTime() + 86400000)
    const [sameDay, lastPeriod, lastBilled] = await Promise.all([
        prisma.reading.findMany({ where: { ...notSelf, date: { gte: dayStart, lt: dayEnd } } }),
        prisma.billPeriod.findFirst({ orderBy: { toDate: 'desc' } }),
        prisma.reading.findFirst({ where: { ...notSelf, billedAt: { not: null } }, orderBy: [{ date: 'desc' }, { id: 'desc' }] })
    ])
    const sameDayError = checkSameDayMeterChange({ date: data.date, meterChange: data.meterChange, others: sameDay })
    if (sameDayError) return sameDayError
    const dates = [lastPeriod?.toDate, lastBilled?.date].filter(Boolean).map((d) => d.getTime())
    const lastBilledDate = dates.length ? new Date(Math.max(...dates)) : null
    return checkAfterBilledPeriod({ date: data.date, lastBilledDate })
}

function readingFields({ date, valueHT, valueNT, comment, meterChange, oldFinalHT, oldFinalNT }) {
    return {
        date,
        valueHT,
        valueNT,
        comment,
        meterChange,
        oldFinalHT: meterChange ? oldFinalHT : null,
        oldFinalNT: meterChange ? oldFinalNT : null
    }
}

const REFERENCED_ERROR = (verb) => `Dieser Zählerstand ist Start- oder Endpunkt einer Abrechnung und kann nicht ${verb} werden.`

async function isReferencedByBillPeriod(id) {
    const ref = await prisma.billPeriod.findFirst({
        where: { OR: [{ fromReadingId: id }, { toReadingId: id }] },
        select: { id: true }
    })
    return Boolean(ref)
}

export async function addReading(formData) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { success: false, error: 'Nicht authentifiziert' }
    }

    const parsed = parseReadingForm(formData)
    if (parsed.error) return { success: false, error: parsed.error }

    const dateError = await checkDateRules(parsed.data)
    if (dateError) return { success: false, error: dateError }

    const rollbackError = await checkAgainstNeighbours(parsed.data)
    if (rollbackError) return { success: false, error: rollbackError }

    try {
        await prisma.$transaction(async (tx) => {
            const created = await tx.reading.create({ data: readingFields(parsed.data) })
            await tx.readingChange.create({
                data: { readingId: created.id, action: 'create', after: snapshotReading(created) }
            })
        })
    } catch (e) {
        console.error('addReading error:', e)
        return { success: false, error: 'Fehler beim Speichern' }
    }

    revalidatePath('/')
    revalidatePath('/readings')
    return { success: true }
}

export async function updateReading(id, formData) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { success: false, error: 'Nicht authentifiziert' }
    }

    const existing = await prisma.reading.findUnique({ where: { id } })
    if (!existing) {
        return { success: false, error: 'Zählerstand nicht gefunden' }
    }
    if (existing.billedAt) {
        return { success: false, error: 'Abgerechnete Zählerstände können nicht bearbeitet werden.' }
    }

    const parsed = parseReadingForm(formData)
    if (parsed.error) return { success: false, error: parsed.error }

    if (await isReferencedByBillPeriod(id)) {
        return { success: false, error: REFERENCED_ERROR('bearbeitet') }
    }

    const dateError = await checkDateRules(parsed.data, id)
    if (dateError) return { success: false, error: dateError }

    const rollbackError = await checkAgainstNeighbours(parsed.data, id)
    if (rollbackError) return { success: false, error: rollbackError }

    try {
        await prisma.$transaction(async (tx) => {
            // billedAt: null im WHERE schützt vor Race mit einer parallelen Abrechnung
            const res = await tx.reading.updateMany({
                where: { id, billedAt: null },
                data: readingFields(parsed.data)
            })
            if (res.count !== 1) throw new Error('BILLED')
            const updated = await tx.reading.findUnique({ where: { id } })
            await tx.readingChange.create({
                data: { readingId: id, action: 'update', before: snapshotReading(existing), after: snapshotReading(updated) }
            })
        })
    } catch (e) {
        if (e.message === 'BILLED') {
            return { success: false, error: 'Abgerechnete Zählerstände können nicht bearbeitet werden.' }
        }
        console.error('updateReading error:', e)
        return { success: false, error: 'Fehler beim Speichern' }
    }

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
    if (await isReferencedByBillPeriod(id)) {
        return { success: false, error: REFERENCED_ERROR('gelöscht') }
    }

    try {
        await prisma.$transaction([
            prisma.reading.delete({ where: { id } }),
            prisma.readingChange.create({
                data: { readingId: id, action: 'delete', before: snapshotReading(reading) }
            })
        ])

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
export async function buildReportPayload(fromId, toId) {
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
        return { success: false, error: NO_PRICE_ERROR }
    }

    // Zwischenstände laden, damit Zählertausch innerhalb der Periode korrekt berechnet wird
    const between = await prisma.reading.findMany({
        where: { date: { gt: fromReading.date, lt: toReading.date } },
        orderBy: [{ date: 'asc' }, { id: 'asc' }]
    })

    const calc = calculatePeriodCost(fromReading, toReading, relevantPrice, between)
    if (!calc) {
        return { success: false, error: 'Fehler bei der Berechnung (Zählerstände ungültig oder rückwärts laufend; bei Zählertausch Endstand des alten Zählers prüfen).' }
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

    // WhatsApp-URLs VORAB bauen (test + echt): Der Dialog kann die Links beim
    // Klick gesture-pur abfeuern (Custom-Scheme ohne await — sonst blockt iOS
    // window.open nach Server-Roundtrip still).
    const waSendMsg = payload.message
    const waSend = normalized ? buildWhatsAppAppUrl(normalized, waSendMsg) : { ok: false }
    const waSendHttps = normalized ? buildWhatsAppUrl(normalized, waSendMsg) : { ok: false }

    return {
        success: true,
        data: {
            message: payload.message,
            whatsapp: {
                configured: Boolean(normalized),
                formattedNumber: normalized ? formatWhatsAppNumber(normalized) : null,
                warning: rawNumber && !normalized
                    ? 'Gespeicherte Nummer ist kein gültiges Format (z. B. +49 oder 0170…). Bitte in den Einstellungen korrigieren.'
                    : null,
                sendSchemeUrl: waSend.ok ? waSend.url : null,
                sendHttpsUrl: waSendHttps.ok ? waSendHttps.url : null
            }
        }
    }
}

/**
 * Sende einen benutzerdefinierten Telegram-Report mit Billing-Tracking
 * mode='test': Report wird gesendet, aber NICHT als abgerechnet gebucht
 */
export async function sendCustomTelegramReport(fromId, toId) {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Nicht eingeloggt' }

    const payload = await buildReportPayload(fromId, toId)
    if (!payload.success) return payload

    const { fromReading, toReading, calc, message } = payload
    const { total: totalCost, energyCost, baseFeeCost, billingMonths, diffHT, diffNT } = calc

    // Telegram-Empfänger aus der WebUI (AppSettings), Fallback: TELEGRAM_CHAT_ID (.env)
    const settings = await getAppSettings()
    const parsedIds = parseTelegramChatIds(settings?.telegramChatIds || '')

    if (parsedIds.ids.length === 0 && !process.env.TELEGRAM_CHAT_ID) {
        return { success: false, error: 'Keine Telegram-Empfänger konfiguriert (Einstellungen oder TELEGRAM_CHAT_ID).' }
    }

    // 5. Send to Telegram (alle Empfänger — Teilerfolg geht als warning durch)
    const sendResult = await sendTelegramMessage(message, parsedIds.ids.length > 0 ? parsedIds.ids : null)
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
 * mode='test': Link wird erzeugt/geöffnet, aber NICHT gebucht
 */
export async function sendWhatsAppReportAction(fromId, toId, mode = 'send') {
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
                ? 'Gespeicherte Nummer ist ungültig. Bitte in den Einstellungen prüfen (z. B. +49 123 456789).'
                : 'Keine WhatsApp-Empfängernummer gesetzt. Bitte in den Einstellungen hinterlegen.'
        }
    }

    const urlResult = buildWhatsAppUrl(normalized, message + (mode === 'test' ? '\n\n⚠️ TEST — nicht abgerechnet' : ''))
    if (!urlResult.ok) {
        return { success: false, error: urlResult.error }
    }

    // Booking VOR dem Öffnen des Links: Der Klick öffnet WhatsApp, aber ob der
    // User dort wirklich "Senden" tippt, sieht die App nicht. Ohne Booking
    // hätten wir doppelte Risiko-Läufe (Doppel-Abrechnung). Bewusst so.
    if (mode !== 'test') {
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
    }

    revalidatePath('/')
    if (mode !== 'test') revalidatePath('/billing-history')

    return {
        success: true,
        data: {
            whatsappUrl: urlResult.url,
            formattedNumber: formatWhatsAppNumber(normalized)
        },
        testMode: mode === 'test'
    }
}

/**
 * BillPeriod zuruecksetzen: Periode loeschen und alle zugehoerigen Readings
 * wieder auf "offen" (billedAt=null) setzen. Fuer Testfaelle/Fehlbuchungen.
 */
export async function resetBillPeriodAction(billPeriodId) {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Nicht eingeloggt' }

    try {
        // Nur die neueste Abrechnung darf zurückgesetzt werden
        const latest = await prisma.billPeriod.findFirst({
            orderBy: [{ toDate: 'desc' }, { sentAt: 'desc' }]
        })
        if (!latest || latest.id !== billPeriodId) {
            return { success: false, error: 'Es kann nur die zuletzt erstellte Abrechnung zurückgesetzt werden.' }
        }

        // Readings auf offen setzen und Periode löschen – atomar
        const [updated] = await prisma.$transaction([
            prisma.reading.updateMany({
                where: { billPeriodId: billPeriodId },
                data: { billedAt: null, billPeriodId: null }
            }),
            prisma.billPeriod.delete({ where: { id: billPeriodId } })
        ])

        revalidatePath('/')
        revalidatePath('/billing-history')
        revalidatePath('/readings')

        return { success: true, readingsReset: updated.count }
    } catch (e) {
        console.error('resetBillPeriod error:', e)
        return { success: false, error: 'Zuruecksetzen fehlgeschlagen: ' + (e.message || 'unbekannter Fehler') }
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

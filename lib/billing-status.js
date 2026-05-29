/**
 * Billing Status Utilities
 *
 * Core logic for billing tracking: unbilled readings, period validation,
 * available periods, bill creation, and history.
 */

import prisma from '@/lib/db'
import { calculatePeriodCost } from '@/lib/billing'

/**
 * Validiere eine Billing-Periode
 * Prüft: Doppel-Abrechnung, gültige IDs, min 2 Readings
 *
 * Returns the fetched readings so callers can reuse them without re-querying.
 */
export async function validateBillingPeriod(fromId, toId) {
    const fromReading = await prisma.reading.findUnique({ where: { id: fromId } })
    const toReading = await prisma.reading.findUnique({ where: { id: toId } })

    if (!fromReading || !toReading) {
        return { valid: false, error: 'Readings nicht gefunden.' }
    }

    const previousBillPeriod = fromReading.billedAt
        ? await prisma.billPeriod.findFirst({
            where: { toReadingId: fromId }
        })
        : null

    if (fromReading.billedAt && !previousBillPeriod) {
        return { valid: false, error: `Zählerstand vom ${fromReading.date.toLocaleDateString('de-DE')} wurde bereits abgerechnet und kann nicht als neuer Startpunkt verwendet werden.` }
    }

    if (toReading.billedAt) {
        return { valid: false, error: `Zählerstand vom ${toReading.date.toLocaleDateString('de-DE')} wurde bereits abgerechnet.` }
    }

    if (fromReading.date >= toReading.date) {
        return { valid: false, error: 'Der Start-Zeitpunkt muss vor dem End-Zeitpunkt liegen.' }
    }

    // Allow the closing reading of the previous bill period as the new reference point,
    // but reject all other overlaps so billed ranges remain unambiguous.
    const overlapping = await prisma.billPeriod.findFirst({
        where: {
            AND: [
                { fromDate: { lte: toReading.date } },
                { toDate: { gte: fromReading.date } },
                ...(previousBillPeriod ? [{ id: { not: previousBillPeriod.id } }] : [])
            ]
        }
    })

    if (overlapping) {
        return {
            valid: false,
            error: `Überschneidung mit Abrechnung vom ${overlapping.sentAt.toLocaleDateString('de-DE')} (${overlapping.fromDate.toLocaleDateString('de-DE')} – ${overlapping.toDate.toLocaleDateString('de-DE')})`
        }
    }

    return { valid: true, fromReading, toReading }
}

/**
 * Hole verfügbare Abrechnungs-Perioden
 * Gibt smarte Vorschläge zurück (z.B. "Letzte 3 Monate", "Alle offenen")
 *
 * Uses a single query instead of 3 separate ones.
 */
export async function getAvailableBillingPeriods() {
    const allReadings = await prisma.reading.findMany({
        orderBy: { date: 'asc' }
    })

    const unbilled = allReadings.filter(r => r.billedAt === null)

    if (unbilled.length < 1) {
        return { periods: [], unbilledReadings: [], message: 'Keine offenen Zählerstände vorhanden.' }
    }

    // We need at least one billed reading as "from" reference, or 2+ unbilled
    const lastBilled = [...allReadings].reverse().find(r => r.billedAt !== null) || null

    if (!lastBilled && unbilled.length < 2) {
        return { periods: [], unbilledReadings: unbilled, message: 'Mindestens 2 Zählerstände benötigt.' }
    }

    const fromReading = lastBilled || unbilled[0]
    const suggestions = []

    // "Alle offenen" - from last billed to newest unbilled
    if (unbilled.length > 0) {
        const toReading = unbilled[unbilled.length - 1]
        if (fromReading.date < toReading.date) {
            suggestions.push({
                id: 'all',
                label: `Alle offenen (${unbilled.length} Zählerstand${unbilled.length > 1 ? 'e' : ''})`,
                fromId: fromReading.id,
                toId: toReading.id,
                fromDate: fromReading.date,
                toDate: toReading.date
            })
        }
    }

    // "Letzte 3 Monate" suggestion
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const recentUnbilled = unbilled.filter(r => r.date >= threeMonthsAgo)
    if (recentUnbilled.length > 0) {
        const toReading = recentUnbilled[recentUnbilled.length - 1]
        if (fromReading.date < toReading.date) {
            suggestions.push({
                id: 'last3',
                label: 'Letzte 3 Monate',
                fromId: fromReading.id,
                toId: toReading.id,
                fromDate: fromReading.date,
                toDate: toReading.date
            })
        }
    }

    return {
        periods: suggestions,
        unbilledReadings: unbilled,
        fromReading: fromReading
    }
}

/**
 * Erstelle eine BillPeriod und markiere Readings als abgerechnet
 *
 * Accepts pre-fetched reading objects to avoid redundant DB queries.
 */
export async function createBillPeriod({ fromId, toId, totalCost, energyCost, baseFeeCost, billingMonths, diffHT, diffNT, sentVia = 'telegram', fromReading: passedFromReading, toReading: passedToReading }) {
    // Use passed readings if available, otherwise fetch from DB
    const fromReading = passedFromReading || await prisma.reading.findUnique({ where: { id: fromId } })
    const toReading = passedToReading || await prisma.reading.findUnique({ where: { id: toId } })

    if (!fromReading || !toReading) {
        throw new Error('Readings nicht gefunden')
    }

    // Create BillPeriod
    const billPeriod = await prisma.billPeriod.create({
        data: {
            fromDate: fromReading.date,
            toDate: toReading.date,
            fromReadingId: fromId,
            toReadingId: toId,
            totalCost,
            energyCost,
            baseFeeCost,
            billingMonths,
            diffHT,
            diffNT,
            sentVia
        }
    })

    // Mark all readings between from and to (inclusive of to, exclusive of from) as billed
    // The "from" reading is the reference point (already billed or start),
    // the "to" and intermediate readings are the ones being billed
    const readingsToMark = await prisma.reading.findMany({
        where: {
            date: { gt: fromReading.date, lte: toReading.date },
            billedAt: null
        }
    })

    if (readingsToMark.length > 0) {
        await prisma.reading.updateMany({
            where: {
                id: { in: readingsToMark.map(r => r.id) }
            },
            data: {
                billedAt: new Date(),
                billPeriodId: billPeriod.id
            }
        })
    }

    return billPeriod
}

/**
 * Hole Abrechnungs-Historie
 */
export async function getBillingHistory() {
    return prisma.billPeriod.findMany({
        orderBy: { sentAt: 'desc' }
    })
}
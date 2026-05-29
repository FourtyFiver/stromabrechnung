import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { generateBillingPDFBuffer } from '@/lib/pdf-generator'
import { findRelevantPrice } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

function getPdfFilename(billPeriod) {
    const fromDate = new Date(billPeriod.fromDate).toLocaleDateString('de-DE').replace(/\./g, '-')
    const toDate = new Date(billPeriod.toDate).toLocaleDateString('de-DE').replace(/\./g, '-')
    return `stromabrechnung_${fromDate}_${toDate}.pdf`
}

function buildPdfPayload(billPeriod, fromReading, toReading, price) {
    return {
        fromDate: billPeriod.fromDate,
        toDate: billPeriod.toDate,
        totalCost: billPeriod.totalCost,
        energyCost: billPeriod.energyCost,
        baseFeeCost: billPeriod.baseFeeCost,
        billingMonths: billPeriod.billingMonths,
        diffHT: billPeriod.diffHT,
        diffNT: billPeriod.diffNT,
        fromReading: {
            date: fromReading.date,
            valueHT: fromReading.valueHT,
            valueNT: fromReading.valueNT
        },
        toReading: {
            date: toReading.date,
            valueHT: toReading.valueHT,
            valueNT: toReading.valueNT
        },
        price: {
            validFrom: price.validFrom,
            priceHT: price.priceHT,
            priceNT: price.priceNT,
            baseFee: price.baseFee,
            baseFeeSplit: price.baseFeeSplit ?? 50
        }
    }
}

export async function GET(_request, context) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new Response('Nicht eingeloggt', { status: 401 })
    }

    const { id } = await context.params
    const billPeriod = await prisma.billPeriod.findUnique({
        where: { id },
        select: {
            id: true,
            fromDate: true,
            toDate: true,
            fromReadingId: true,
            toReadingId: true,
            totalCost: true,
            energyCost: true,
            baseFeeCost: true,
            billingMonths: true,
            diffHT: true,
            diffNT: true
        }
    })

    if (!billPeriod) {
        return new Response('Abrechnung nicht gefunden', { status: 404 })
    }

    try {
        const [fromReading, toReading, allPrices] = await Promise.all([
            prisma.reading.findUnique({
                where: { id: billPeriod.fromReadingId },
                select: { date: true, valueHT: true, valueNT: true }
            }),
            prisma.reading.findUnique({
                where: { id: billPeriod.toReadingId },
                select: { date: true, valueHT: true, valueNT: true }
            }),
            prisma.priceConfig.findMany({
                orderBy: { validFrom: 'desc' }
            })
        ])

        if (!fromReading || !toReading) {
            return new Response('Zugehoerige Zaehlerstaende fehlen', { status: 404 })
        }

        const relevantPrice = findRelevantPrice(allPrices, billPeriod.toDate)
        if (!relevantPrice) {
            return new Response('Kein Strompreis fuer die Abrechnung gefunden', { status: 404 })
        }

        const pdfBuffer = await generateBillingPDFBuffer(buildPdfPayload(billPeriod, fromReading, toReading, relevantPrice))

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${getPdfFilename(billPeriod)}"; filename*=UTF-8''${encodeURIComponent(getPdfFilename(billPeriod))}`,
                'Cache-Control': 'private, no-store'
            }
        })
    } catch (error) {
        console.error('PDF route error:', error)
        return new Response('PDF konnte nicht erstellt werden', { status: 500 })
    }
}
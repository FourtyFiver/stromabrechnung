import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { buildCsv, formatDateDE } from '@/lib/csv'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new Response('Nicht autorisiert', { status: 401 })
    }

    const yearParam = new URL(request.url).searchParams.get('year')
    let where = {}
    let suffix = ''
    if (yearParam !== null && yearParam !== '') {
        const year = Number(yearParam)
        if (!/^\d{4}$/.test(yearParam) || year < 1970 || year > 2200) {
            return new Response('Ungültiges Jahr', { status: 400 })
        }
        // Abrechnungen, deren Zeitraum-Ende im gewählten Jahr liegt
        where = { toDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
        suffix = `_${year}`
    }

    const periods = await prisma.billPeriod.findMany({ where, orderBy: { fromDate: 'asc' } })
    const csv = buildCsv(
        ['Von', 'Bis', 'HT (kWh)', 'NT (kWh)', 'Energiekosten (€)', 'Grundgebühr (€)', 'Gesamt (€)', 'Versandart'],
        periods.map(p => [
            formatDateDE(p.fromDate),
            formatDateDE(p.toDate),
            p.diffHT,
            p.diffNT,
            p.energyCost,
            p.baseFeeCost,
            p.totalCost,
            p.sentVia
        ])
    )

    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="abrechnungen${suffix}.csv"`,
            'Cache-Control': 'no-store'
        }
    })
}

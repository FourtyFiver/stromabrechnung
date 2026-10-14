import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { buildCsv, formatDateDE } from '@/lib/csv'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new Response('Nicht autorisiert', { status: 401 })
    }

    const readings = await prisma.reading.findMany({ orderBy: [{ date: 'asc' }, { id: 'asc' }] })
    const csv = buildCsv(
        ['Datum', 'HT (kWh)', 'NT (kWh)', 'Kommentar', 'Abgerechnet', 'Zählertausch', 'Endstand alt HT (kWh)', 'Endstand alt NT (kWh)'],
        readings.map(r => [
            formatDateDE(r.date),
            r.valueHT,
            r.valueNT,
            r.comment || '',
            r.billedAt ? 'ja' : 'nein',
            r.meterChange ? 'ja' : 'nein',
            r.meterChange ? (r.oldFinalHT ?? '') : '',
            r.meterChange ? (r.oldFinalNT ?? '') : ''
        ])
    )

    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="zaehlerstaende.csv"',
            'Cache-Control': 'no-store'
        }
    })
}

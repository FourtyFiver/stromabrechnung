/**
 * Migration Script: Mark existing readings as billed
 * 
 * Marks all existing readings (except the newest) as already billed.
 * This is a one-time migration for the billing tracking feature.
 * 
 * Usage: node prisma/migrations/mark-existing-billed.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // Check if any readings are already marked as billed
    const alreadyBilled = await prisma.reading.count({
        where: { billedAt: { not: null } }
    })

    if (alreadyBilled > 0) {
        console.log(`⏭️  Migration übersprungen: ${alreadyBilled} Readings sind bereits als abgerechnet markiert.`)
        return
    }

    const allReadings = await prisma.reading.findMany({
        orderBy: { date: 'desc' }
    })

    if (allReadings.length < 2) {
        console.log('⏭️  Migration übersprungen: Weniger als 2 Readings vorhanden.')
        return
    }

    // Keep the newest reading unbilled, mark rest as billed
    const toBill = allReadings.slice(1)
    const now = new Date()

    const result = await prisma.reading.updateMany({
        where: {
            id: { in: toBill.map(r => r.id) }
        },
        data: {
            billedAt: now,
            billingNote: 'Automatisch markiert (initiale Migration)'
        }
    })

    console.log(`✅ Migration erfolgreich: ${result.count} Readings als abgerechnet markiert.`)
    console.log(`   Neuester Zählerstand (${allReadings[0].date.toLocaleDateString('de-DE')}) bleibt offen.`)
}

main()
    .catch((e) => {
        console.error('❌ Migration fehlgeschlagen:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

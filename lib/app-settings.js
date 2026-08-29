import prisma from '@/lib/db'

/**
 * App-weite Einstellungen (single row, id=1).
 *
 * Aktuell:
 * - whatsappNumber: WhatsApp-Empfänger (Mieter), normalisiert (nur Ziffern inkl. Ländercode)
 *
 * SQLite/Prisma: Tabelle wird via prisma db push angelegt (kein Migrationsworkflow in diesem Repo).
 */

const SINGLETON_ID = 1

/**
 * Lädt die AppSettings-Zeile (id=1). Erzeugt sie lazily bei erstem Zugriff,
 * damit frische Installationen ohne manuellen Seed funktionieren.
 * @returns {Promise<Object>} AppSettings-Zeile
 */
export async function getAppSettings() {
    const existing = await prisma.appSettings.findUnique({ where: { id: SINGLETON_ID } })
    if (existing) return existing
    try {
        return await prisma.appSettings.create({ data: { id: SINGLETON_ID } })
    } catch (e) {
        // Race mit parallelen Requests: nochmal lesen
        const retry = await prisma.appSettings.findUnique({ where: { id: SINGLETON_ID } })
        if (retry) return retry
        throw e
    }
}

/**
 * Aktualisiert einzelne Felder der AppSettings.
 * @param {Object} data - Zu setzende Felder (z.B. { whatsappNumber: '49170...' })
 * @returns {Promise<Object>} Aktualisierte AppSettings-Zeile
 */
export async function updateAppSettings(data) {
    await getAppSettings()
    return prisma.appSettings.update({
        where: { id: SINGLETON_ID },
        data
    })
}
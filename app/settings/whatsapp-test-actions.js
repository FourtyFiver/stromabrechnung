'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAppSettings } from "@/lib/app-settings"
import { normalizeWhatsAppNumber, buildWhatsAppUrl, buildWhatsAppAppUrl } from "@/lib/whatsapp"

/**
 * Liefert die WhatsApp-Test-Links (Custom-Scheme + HTTPS) für die GESPEICHERTE
 * Nummer. Test-Nachricht ist kurz und geht nie an den Mieter — der User öffnet
 * sie selbst und landet im Eigen-Chat ("Message yourself").
 */
export async function getWhatsAppTestUrls() {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { success: false, error: 'Nicht authentifiziert' }
    }

    const settings = await getAppSettings()
    const raw = settings?.whatsappNumber || ''
    const normalized = raw ? normalizeWhatsAppNumber(raw) : null
    if (!normalized) {
        return { success: false, error: 'Keine WhatsApp-Nummer gespeichert. Bitte zuerst speichern.' }
    }

    const msg = '✅ WhatsApp-Test: Konfiguration der Stromabrechnung funktioniert.'
    const scheme = buildWhatsAppAppUrl(normalized, msg)
    const https = buildWhatsAppUrl(normalized, msg)

    return {
        success: true,
        data: {
            schemeUrl: scheme.ok ? scheme.url : null,
            httpsUrl: https.ok ? https.url : null,
            formattedNumber: '+' + normalized
        }
    }
}
'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAppSettings } from "@/lib/app-settings"
import { normalizeWhatsAppNumber, buildWhatsAppUrl, buildWhatsAppAppUrl } from "@/lib/whatsapp"
import { getAvailableBillingPeriods } from "@/lib/billing-status"
import { buildReportPayload } from "@/app/actions"

/**
 * Liefert die WhatsApp-Test-Links (Custom-Scheme + HTTPS) für die GESPEICHERTE
 * Nummer — mit dem ECHTEN Report-Inhalt der neuesten offenen Periode plus
 * Test-Hinweis. Der Test prueft damit nicht nur den Versand, sondern auch,
 * ob Emojis/Umbrueche/Werte ordentlich im Link ankommen. Geöffnet wird im
 * Eigen-Chat ("Message yourself") — kein Empfänger wird kontaktiert.
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

    // Neueste offene Periode für den echten Report-Inhalt
    const periods = await getAvailableBillingPeriods()
    if (!periods.periods || periods.periods.length === 0) {
        return { success: false, error: periods.message || 'Keine Periode für den Test verfügbar — mindestens 2 Zählerstände nötig.' }
    }
    const latest = [...periods.periods].sort((a, b) => b.toDate - a.toDate)[0]

    const payload = await buildReportPayload(latest.fromId, latest.toId)
    if (!payload.success) {
        return { success: false, error: payload.error }
    }

    const msg = payload.message + '\n\n⚠️ TEST — nicht abgerechnet'
    const scheme = buildWhatsAppAppUrl(normalized, msg)
    const https = buildWhatsAppUrl(normalized, msg)

    return {
        success: true,
        data: {
            schemeUrl: scheme.ok ? scheme.url : null,
            httpsUrl: https.ok ? https.url : null,
            formattedNumber: '+' + normalized,
            periodLabel: latest.label
        }
    }
}

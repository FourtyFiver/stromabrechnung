'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAppSettings, updateAppSettings } from "@/lib/app-settings"
import { normalizeWhatsAppNumber, formatWhatsAppNumber } from "@/lib/whatsapp"
import { revalidatePath } from "next/cache"

/**
 * Speichert die WhatsApp-Empfängernummer (Mieter bzw. eigene Nummer zum Testen).
 *
 * Die Nummer wird in normalisierter Form (nur Ziffern inkl. Ländercode) gespeichert,
 * damit der wa.me-Link sie direkt verwenden kann.
 */
export async function saveWhatsAppSettings(whatsappNumber) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { success: false, error: 'Nicht authentifiziert' }
    }

    // Leere Eingabe = Nummer löschen (WhatsApp-Versand deaktiviert)
    const raw = typeof whatsappNumber === 'string' ? whatsappNumber.trim() : ''
    if (!raw) {
        await updateAppSettings({ whatsappNumber: null })
        revalidatePath('/settings')
        revalidatePath('/')
        return { success: true, data: { configured: false, normalized: null, formatted: null } }
    }

    const normalized = normalizeWhatsAppNumber(raw)
    if (!normalized) {
        return {
            success: false,
            error: 'Ungültige Nummer. Erwartet z. B. +49 170 1234567, 0170 1234567 oder 491701234567.'
        }
    }

    await updateAppSettings({ whatsappNumber: normalized })
    revalidatePath('/settings')
    revalidatePath('/')

    return {
        success: true,
        data: {
            configured: true,
            normalized,
            formatted: formatWhatsAppNumber(normalized)
        }
    }
}
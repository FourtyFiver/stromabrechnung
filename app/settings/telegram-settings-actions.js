'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAppSettings, updateAppSettings } from "@/lib/app-settings"
import { parseTelegramChatIds, serializeTelegramChatIds, normalizeTelegramChatId } from "@/lib/telegram-settings"
import { sendTelegramMessage } from "@/lib/telegram"
import { revalidatePath } from "next/cache"

/**
 * Speichert die Telegram-Konfiguration:
 * - chatIdsText: Textarea, eine Chat-ID pro Zeile (Empfänger der echten Reports)
 * - testChatId:  einzelne ID für Test-Versände (leer = .env-Fallback)
 */
export async function saveTelegramSettings(chatIdsText, testChatId) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { success: false, error: 'Nicht authentifiziert' }
    }

    // Empfängerliste parsen
    const parsed = parseTelegramChatIds(chatIdsText)
    if (parsed.invalid.length > 0) {
        return {
            success: false,
            error: `Ungültige Chat-ID${parsed.invalid.length > 1 ? 's' : ''}: ${parsed.invalid.join(', ')}. Erwartet nur Ziffern — Gruppen-IDs sind negativ (z. B. -1001234567890).`
        }
    }
    if (parsed.tooMany) {
        return { success: false, error: 'Maximal 10 Chat-IDs erlaubt.' }
    }

    // Test-Chat-ID
    let testId = null
    const testRaw = typeof testChatId === 'string' ? testChatId.trim() : ''
    if (testRaw) {
        testId = normalizeTelegramChatId(testRaw)
        if (!testId) {
            return { success: false, error: 'Ungültige Test-Chat-ID. Erwartet nur Ziffern (Gruppen negativ).' }
        }
    }

    await updateAppSettings({
        // Leere Liste => null speichern, damit der .env-Fallback greift
        telegramChatIds: parsed.ids.length > 0 ? serializeTelegramChatIds(parsed.ids) : null,
        telegramTestChatId: testId
    })
    revalidatePath('/settings')

    return {
        success: true,
        data: {
            count: parsed.ids.length,
            testConfigured: Boolean(testId)
        }
    }
}

/**
 * Test-Nachricht — geht AUSSCHLIESSLICH an die Test-Chat-ID:
 * - WebUI-Test-ID gesetzt -> nur diese
 * - sonst TELEGRAM_CHAT_ID aus .env (Fallback, Legacy-Setup)
 * Die Empfängerliste wird bewusst NICHT angetastet — der Mieter bekommt
 * keine Test-Nachrichten.
 */
export async function sendTelegramTestMessage() {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { success: false, error: 'Nicht authentifiziert' }
    }

    // Test-Ziel: WebUI-Test-Chat-ID, Fallback .env (TELEGRAM_CHAT_ID).
    // Die Empfängerliste wird bewusst NICHT angetastet.
    const settings = await getAppSettings()
    const testId = settings?.telegramTestChatId || null
    const targets = testId ? [testId] : null

    if (!testId && !process.env.TELEGRAM_CHAT_ID) {
        return { success: false, error: 'Kein Test-Ziel konfiguriert: Test-Chat-ID eintragen oder TELEGRAM_CHAT_ID in .env setzen.' }
    }

    // Echten Report-Inhalt der neuesten offenen Periode verwenden — der Test
    // prüft nicht nur den Versand, sondern auch, ob die Nachricht richtig
    // formatiert ankommt (Emojis, Zeilenumbrüche, Werte).
    const periods = await getAvailableBillingPeriods()
    if (!periods.periods || periods.periods.length === 0) {
        return { success: false, error: periods.message || 'Keine Periode für den Test verfügbar — mindestens 2 Zählerstände nötig.' }
    }
    // Neueste Periode = größtes toDate
    const latest = [...periods.periods].sort((a, b) => b.toDate - a.toDate)[0]

    const payload = await buildReportPayload(latest.fromId, latest.toId)
    if (!payload.success) {
        return { success: false, error: payload.error }
    }

    const msg = payload.message + '\n\n⚠️ TEST — nicht abgerechnet'
    const result = await sendTelegramMessage(msg, targets)

    if (!result.success) {
        return { success: false, error: result.error || 'Test-Report fehlgeschlagen.' }
    }
    return {
        success: true,
        data: {
            sentTo: testId || '(aus .env: TELEGRAM_CHAT_ID)',
            periodLabel: latest.label,
            warning: result.warning
        }
    }
}

/**
 * Telegram Bot API — Multi-Recipient-Versand.
 *
 * Token: immer aus .env (TELEGRAM_BOT_TOKEN) — Secret gehört nicht in die DB.
 * Empfänger: chatIds-Array. Leere Liste = Fallback auf TELEGRAM_CHAT_ID aus
 * .env (Legacy-Setup bleibt so ohne Konfigurationsaufwand aktiv).
 *
 * @param {string} message - Text (Markdown parse_mode)
 * @param {string[]|null} [chatIds] - Ziel-Chat-IDs (z.B. ['123456', '-100123...'])
 * @returns {Promise<{success: boolean, error?: string, results?: Array<{chatId: string, ok: boolean, error?: string}>, sent: number, total: number}>}
 */
export async function sendTelegramMessage(message, chatIds = null) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
        return { success: false, error: 'Telegram nicht konfiguriert (TELEGRAM_BOT_TOKEN fehlt)' }
    }

    // Fallback-Kette: übergebene IDs -> .env-Chat-ID
    let targets = Array.isArray(chatIds) ? chatIds.filter(Boolean) : []
    if (targets.length === 0) {
        const envChatId = process.env.TELEGRAM_CHAT_ID
        if (!envChatId) {
            return { success: false, error: 'Keine Telegram-Empfänger konfiguriert (WebUI oder TELEGRAM_CHAT_ID)' }
        }
        targets = [envChatId]
    }

    const results = []
    for (const chatId of targets) {
        try {
            const url = `https://api.telegram.org/bot${token}/sendMessage`
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            })
            const data = await res.json()
            if (!data.ok) {
                console.error('Telegram API Error:', chatId, data.description)
                results.push({ chatId, ok: false, error: data.description })
            } else {
                results.push({ chatId, ok: true })
            }
        } catch (e) {
            console.error('Telegram Fetch Error:', chatId, e)
            results.push({ chatId, ok: false, error: 'Verbindungsfehler' })
        }
    }

    const sent = results.filter(r => r.ok).length
    const failed = results.filter(r => !r.ok)
    if (sent === 0) {
        return { success: false, error: failed[0]?.error || 'Telegram-Versand fehlgeschlagen', results, sent, total: results.length }
    }
    return {
        success: true,
        warning: failed.length > 0 ? `${failed.length}/${results.length} Empfänger fehlgeschlagen: ${failed.map(f => f.error).join(', ')}` : undefined,
        results,
        sent,
        total: results.length
    }
}

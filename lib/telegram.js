/**
 * Send a message via Telegram Bot API.
 *
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.
 *
 * @param {string} message - The message text to send (supports Markdown parse_mode)
 * @returns {{ success: boolean, error?: string }} Result of the send operation
 */
export async function sendTelegramMessage(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!token || !chatId) {
        return { success: false, error: 'Telegram nicht konfiguriert (.env prüfen)' }
    }

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
            console.error('Telegram API Error:', data)
            return { success: false, error: data.description }
        }

        return { success: true }
    } catch (e) {
        console.error('Telegram Fetch Error:', e)
        return { success: false, error: 'Verbindungsfehler zu Telegram' }
    }
}
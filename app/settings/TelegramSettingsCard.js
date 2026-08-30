'use client'

import { useState } from 'react'
import { saveTelegramSettings, sendTelegramTestMessage } from './telegram-settings-actions'
import { toast } from 'sonner'

/**
 * Einstellungen für den Telegram-Versand (Bot-API):
 * - Empfänger-Chat-IDs: Textarea, eine ID pro Zeile (echte Reports, z.B. Mieter + eigener Chat)
 * - Test-Chat-ID: Ziel für Test-Versände — leer = TELEGRAM_CHAT_ID aus .env
 *
 * Der Bot-Token bleibt bewusst in der .env (Secret wandert nicht in die DB).
 */
export default function TelegramSettingsCard({ initialChatIdsText = '', initialTestChatId = '' }) {
    const [chatIdsText, setChatIdsText] = useState(initialChatIdsText)
    const [testChatId, setTestChatId] = useState(initialTestChatId)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)

    // Live-Vorschau: wie viele valide IDs erkennt der Parser gerade?
    const lines = chatIdsText.split('\n').map(l => l.trim()).filter(Boolean)
    const validCount = lines.filter(l => /^-?\d{1,15}$/.test(l) && Number(l) !== 0).length
    const invalidCount = lines.length - validCount

    async function handleSave() {
        setSaving(true)
        try {
            const result = await saveTelegramSettings(chatIdsText, testChatId)
            if (result.success) {
                const d = result.data
                toast.success(
                    d.count > 0
                        ? `Telegram gespeichert: ${d.count} Empfänger${d.testConfigured ? ' + Test-Chat' : ''} ✅`
                        : 'Telegram-Empfänger entfernt. Versand nutzt TELEGRAM_CHAT_ID aus .env.'
                )
            } else {
                toast.error('Fehler: ' + result.error)
            }
        } catch (e) {
            toast.error('Ein unerwarteter Fehler ist aufgetreten.')
        }
        setSaving(false)
    }

    async function handleTest() {
        setTesting(true)
        try {
            const result = await sendTelegramTestMessage()
            if (result.success) {
                const first = result.results?.[0]
                const detail = first && !first.ok ? ` (${first.error})` : ''
                toast.success(`Test-Nachricht gesendet an ${result.sentTo}${detail} 📤`)
            } else {
                toast.error('Fehler: ' + result.error)
            }
        } catch (e) {
            toast.error('Ein unerwarteter Fehler ist aufgetreten.')
        }
        setTesting(false)
    }

    return (
        <div className="glass-card">
            <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#229ED9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }}>
                    <path d="M21.5 4.5 2.9 11.7c-1 .4-1 1.4-.2 1.7l4.6 1.4 1.8 5.5c.2.7 1 .9 1.5.4l2.6-2.4 4.7 3.5c.6.4 1.4.1 1.6-.6l3.1-15.2c.2-.9-.5-1.5-1.1-1.5z" />
                    <path d="M7.3 15.1 18.9 6.6" />
                </svg>
                Telegram-Empfänger
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                Echte Abrechnungs-Reports gehen an <strong>alle</strong> hier gelisteten Chats (eine Chat-ID pro Zeile).
                Gruppen-IDs sind negativ (z. B. <code>-1001234567890</code>). Der Bot muss jedem Chat einmal eine Nachricht geschrieben haben (&quot;/start&quot;) — sonst blockiert Telegram den Versand an ihn.
            </p>
            <div className="input-group">
                <label>Empfänger-Chat-IDs (eine pro Zeile, max. 10)</label>
                <textarea
                    name="telegramChatIds"
                    className="input-field"
                    rows={3}
                    placeholder={'123456789\n-1001234567890'}
                    value={chatIdsText}
                    onChange={e => setChatIdsText(e.target.value)}
                    disabled={saving}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                {lines.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: invalidCount > 0 ? '#f87171' : 'var(--text-dim)', marginTop: '0.35rem' }}>
                        {validCount} gültig{invalidCount > 0 ? `, ${invalidCount} ungültig` : ''}
                    </div>
                )}
            </div>
            <div className="input-group">
                <label>Test-Chat-ID (optional)</label>
                <input
                    type="text"
                    name="telegramTestChatId"
                    className="input-field"
                    placeholder="123456789 (= deine Chat-ID)"
                    value={testChatId}
                    onChange={e => setTestChatId(e.target.value)}
                    disabled={saving}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                    🧪 Test-Send (Report-Dialog) und der Test-Button unten gehen NUR an diesen Chat — niemals an die Empfängerliste. Leer = TELEGRAM_CHAT_ID aus der .env.
                </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button onClick={handleSave} className="btn" disabled={saving}>
                    {saving ? 'Speichere...' : 'Speichern'}
                </button>
                <button onClick={handleTest} className="btn btn-outline" disabled={testing || saving}>
                    {testing ? 'Sende...' : '📤 Test-Nachricht senden'}
                </button>
            </div>
        </div>
    )
}
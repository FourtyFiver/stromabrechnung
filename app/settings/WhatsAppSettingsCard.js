'use client'

import { useState } from 'react'
import { saveWhatsAppSettings } from './whatsapp-settings-actions'
import { getWhatsAppTestUrls } from './whatsapp-test-actions'
import { toast } from 'sonner'

/**
 * Einstellungen für den WhatsApp-Versand (Click-to-Chat / wa.me):
 * Empfängernummer des Mieters. Zum Verifizieren einfach die eigene
 * Nummer eintragen — WhatsApp öffnet dann den "Message yourself"-Chat.
 */
export default function WhatsAppSettingsCard({ initialNumber = '' }) {
    const [number, setNumber] = useState(initialNumber)
    const [saving, setSaving] = useState(false)
    const [preview, setPreview] = useState('')
    const [testing, setTesting] = useState(false)

    function handleNumberChange(value) {
        setNumber(value)
        // Leichte Live-Vorschau: grobe Anzeige, Validierung passiert serverseitig
        const digits = value.replace(/\D/g, '')
        setPreview(digits ? digits : '')
    }

    async function handleSave() {
        setSaving(true)
        try {
            const result = await saveWhatsAppSettings(number)
            if (result.success) {
                const d = result.data
                if (d.configured) {
                    toast.success(`WhatsApp-Empfänger gespeichert: +${d.normalized} ✅`)
                    setNumber('+' + d.normalized) // kanonische Anzeige nach Speichern
                } else {
                    toast.success('WhatsApp-Empfänger entfernt.')
                    setNumber('')
                }
            } else {
                toast.error('Fehler: ' + result.error)
            }
        } catch (e) {
            toast.error('Ein unerwarteter Fehler ist aufgetreten.')
        }
        setSaving(false)
    }

    /**
     * Gesture-purer WhatsApp-Test (gleiche Technik wie der Report-Dialog):
     * Syncron whatsapp://-Scheme navigieren (iOS-Gesture bleibt erhalten,
     * kein Rest-Tab), Fallback-Link als Toast-Info falls nichts passiert.
     */
    async function handleTest() {
        setTesting(true)
        try {
            const result = await getWhatsAppTestUrls()
            if (!result.success) {
                toast.error('Fehler: ' + result.error)
                setTesting(false)
                return
            }
            const { schemeUrl, httpsUrl, formattedNumber } = result.data

            // Scheme sofort abfeuern (wir sind im Click-Kontext des Buttons)
            if (schemeUrl) {
                window.location.href = schemeUrl
            } else if (httpsUrl) {
                window.open(httpsUrl, '_blank', 'noopener')
            }

            // Fallback: nach 2s noch sichtbar? -> HTTPS-Link per Toast anbieten
            setTimeout(async () => {
                if (document.visibilityState === 'visible' && httpsUrl) {
                    toast.info('WhatsApp hat nicht geöffnet? Test-Link: ' + httpsUrl, {
                        duration: 15000,
                        action: {
                            label: 'Link öffnen',
                            onClick: () => window.open(httpsUrl, '_blank', 'noopener')
                        }
                    })
                }
            }, 2000)

            toast.success(`Test-Link an ${ formattedNumber} geöffnet — im Eigen-Chat landen deine Nachrichten bei dir selbst. 📲`)
        } catch (e) {
            toast.error('Ein unerwarteter Fehler ist aufgetreten.')
        }
        setTesting(false)
    }

    return (
        <div className="glass-card">
            <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }}>
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                WhatsApp-Empfänger
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                Nachrichten per Klick in WhatsApp öffnen — der Versandtipp bleibt bei dir (kein Bot, keine API).
                Zum Testen einfach <strong>deine eigene Nummer</strong> eintragen: WhatsApp öffnet dann deinen Eigen-Chat.
            </p>
            <div className="input-group">
                <label>Mieter-Handynummer</label>
                <input
                    type="tel"
                    name="whatsappNumber"
                    className="input-field"
                    placeholder="+49 123 456789"
                    value={number}
                    onChange={e => handleNumberChange(e.target.value)}
                    disabled={saving}
                />
                {preview && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                        Erkannt: +{preview}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button onClick={handleSave} className="btn" disabled={saving}>
                    {saving ? 'Speichere...' : 'Speichern'}
                </button>
                <button onClick={handleTest} className="btn btn-outline" disabled={testing || saving}>
                    {testing ? 'Öffne...' : '📱 Test-Nachricht senden'}
                </button>
            </div>
        </div>
    )
}
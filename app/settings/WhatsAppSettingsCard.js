'use client'

import { useState } from 'react'
import { saveWhatsAppSettings } from './whatsapp-settings-actions'
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
            <button onClick={handleSave} className="btn" disabled={saving}>
                {saving ? 'Speichere...' : 'Speichern'}
            </button>
        </div>
    )
}
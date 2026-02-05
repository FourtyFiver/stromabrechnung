'use client'

import { useState } from 'react'
import { sendTelegramReport } from '../actions'
import { toast } from 'sonner'

export default function SendReportButton() {
    const [status, setStatus] = useState('idle') // idle, loading, success, error

    async function handleClick() {
        if (!confirm('Möchtest du den aktuellen Abrechnungs-Report an Telegram senden?')) return

        setStatus('loading')
        try {
            const result = await sendTelegramReport()
            if (result.success) {
                setStatus('success')
                toast.success('Bericht erfolgreich gesendet! 📤')
                setTimeout(() => setStatus('idle'), 3000)
            } else {
                setStatus('error')
                toast.error('Fehler beim Senden: ' + result.error)
            }
        } catch (e) {
            setStatus('error')
            toast.error('Ein unerwarteter Fehler ist aufgetreten.')
        }
    }

    return (
        <button
            onClick={handleClick}
            className="btn"
            disabled={status === 'loading'}
            style={{
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
            }}
        >
            {status === 'loading' ? 'Sende...' : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    Report via Telegram
                </>
            )}
        </button>
    )
}

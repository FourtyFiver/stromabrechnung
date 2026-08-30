'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resetBillPeriodAction } from '../actions'
import { toast } from 'sonner'

/**
 * Reset-Button für eine BillPeriod: Löscht den Abrechnungseintrag und setzt
 * alle zugehörigen Readings auf "offen" (billedAt=null). Für Test-Versände
 * und Fehlbuchungen. Mit Bestätigungsdialog (confirm), da destruktiv.
 */
export default function ResetPeriodButton({ billPeriodId, periodLabel }) {
    const [busy, setBusy] = useState(false)
    const router = useRouter()

    async function handleReset() {
        const label = periodLabel || 'diesen Zeitraum'
        if (!window.confirm(
            `${label} wirklich zurücksetzen?\n\n` +
            'Der Abrechnungseintrag wird gelöscht und alle Zählerstände dieser Periode wieder auf "offen" gesetzt. ' +
            'Die bereits gesendete Nachricht bleibt im Chat-Verlauf bestehen.'
        )) {
            return
        }

        setBusy(true)
        try {
            const result = await resetBillPeriodAction(billPeriodId)
            if (result.success) {
                toast.success(`Zurückgesetzt — ${result.readingsReset} Zählerstand${result.readingsReset !== 1 ? 'ände' : ''} wieder offen. 🔄`)
                router.refresh()
            } else {
                toast.error(result.error || 'Zurücksetzen fehlgeschlagen.')
            }
        } catch (e) {
            toast.error('Ein unerwarteter Fehler ist aufgetreten.')
        }
        setBusy(false)
    }

    return (
        <button
            onClick={handleReset}
            disabled={busy}
            className="btn btn-outline"
            style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.7rem',
                color: 'var(--warning, #f59e0b)',
                borderColor: 'var(--warning, #f59e0b)',
                opacity: busy ? 0.6 : 1
            }}
            title="Periode zurücksetzen: Eintrag löschen, Zählerstände wieder auf offen"
        >
            {busy ? '...' : '🔄 Reset'}
        </button>
    )
}
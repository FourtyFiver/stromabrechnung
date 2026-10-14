'use client'

import { useState } from 'react'
import { addReading, updateReading } from "@/app/actions"
import { SubmitButton } from "@/app/components/SubmitButton"
import { toast } from "sonner"

// reading: optional, dann Bearbeiten-Modus (vorbefüllt); onDone wird nach Erfolg/Abbrechen gerufen
function todayLocal() {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function ReadingsForm({ reading = null, onDone = null }) {
    const isEdit = Boolean(reading)
    const str = (v) => (v === null || v === undefined ? '' : String(v))
    const initial = () => ({
        date: isEdit ? new Date(reading.date).toISOString().split('T')[0] : todayLocal(),
        valueHT: str(reading?.valueHT),
        valueNT: str(reading?.valueNT),
        oldFinalHT: str(reading?.oldFinalHT),
        oldFinalNT: str(reading?.oldFinalNT),
        comment: reading?.comment ?? ''
    })
    // Kontrollierte Felder: Eingaben bleiben nach einem Server-Fehler erhalten (React setzt
    // das Formular nach einer Action zurück) und werden nur bei Erfolg geleert.
    const [values, setValues] = useState(initial)
    const [meterChange, setMeterChange] = useState(Boolean(reading?.meterChange))
    const bind = (name) => ({ name, value: values[name], onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })) })

    async function clientAction(formData) {
        try {
            const result = isEdit ? await updateReading(reading.id, formData) : await addReading(formData)
            if (result && result.success) {
                toast.success(isEdit ? 'Zählerstand aktualisiert! ✏️' : 'Zählerstand gespeichert! 📈')
                if (isEdit) {
                    onDone?.()
                    return
                }
                setValues({ ...initial(), date: todayLocal() })
                setMeterChange(false)
            } else if (result && result.error) {
                toast.error('Fehler: ' + result.error)
            }
        } catch (e) {
            toast.error('Ein unerwarteter Fehler ist aufgetreten.')
        }
    }

    return (
        <form action={clientAction} className="responsive-form-grid">
            <div className="input-group">
                <label>Datum</label>
                <input type="date" {...bind('date')} className="input-field" required />
            </div>
            <div className="input-group">
                <label>HT Zählerstand (kWh)</label>
                <input type="number" step="0.1" {...bind('valueHT')} className="input-field" required />
            </div>
            <div className="input-group">
                <label>NT Zählerstand (kWh)</label>
                <input type="number" step="0.1" {...bind('valueNT')} className="input-field" required />
            </div>
            <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" name="meterChange" checked={meterChange} onChange={(e) => setMeterChange(e.target.checked)} />
                    Zählertausch
                </label>
            </div>
            {meterChange && (
                <>
                    <div className="input-group">
                        <label>Endstand alter Zähler HT (kWh)</label>
                        <input type="number" step="0.1" min="0" {...bind('oldFinalHT')} className="input-field" required />
                    </div>
                    <div className="input-group">
                        <label>Endstand alter Zähler NT (kWh)</label>
                        <input type="number" step="0.1" min="0" {...bind('oldFinalNT')} className="input-field" required />
                    </div>
                    <div className="input-group" style={{ gridColumn: '1 / -1', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Die Felder oben (HT/NT Zählerstand) sind bei einem Zählertausch die Startwerte des neuen Zählers.
                    </div>
                </>
            )}
            <div className="input-group">
                <label>Kommentar</label>
                <input type="text" {...bind('comment')} className="input-field" />
            </div>
            <div className="input-group">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <SubmitButton className="btn" style={{ width: '100%' }}>{isEdit ? 'Speichern' : 'Eintragen'}</SubmitButton>
                    {isEdit && <button type="button" className="btn btn-outline" onClick={() => onDone?.()}>Abbrechen</button>}
                </div>
            </div>
        </form>
    )
}

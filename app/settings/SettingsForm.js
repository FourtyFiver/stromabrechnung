'use client'

import { useRef } from 'react'
import { addPriceConfig } from "@/app/actions"
import { SubmitButton } from "@/app/components/SubmitButton"
import { toast } from "sonner"

export default function SettingsForm() {
    const formRef = useRef(null)

    async function clientAction(formData) {
        try {
            const result = await addPriceConfig(formData)
            if (result && result.success) {
                toast.success('Preiseinstellungen gespeichert! 💾')
                formRef.current?.reset()
            } else if (result && result.error) {
                toast.error('Fehler: ' + result.error)
            }
        } catch (e) {
            toast.error('Ein unerwarteter Fehler ist aufgetreten.')
        }
    }

    return (
        <form ref={formRef} action={clientAction}>
            <div className="input-group">
                <label>Preis HT (€/kWh)</label>
                <input type="number" step="0.0001" name="priceHT" className="input-field" required placeholder="0.30" />
            </div>
            <div className="input-group">
                <label>Preis NT (€/kWh)</label>
                <input type="number" step="0.0001" name="priceNT" className="input-field" required placeholder="0.20" />
            </div>
            <div className="input-group">
                <label>Grundgebühr (€/Monat)</label>
                <input type="number" step="0.0001" name="baseFee" className="input-field" placeholder="10.00" />
            </div>
            <div className="input-group">
                <label>Grundgebühr Anteil (%)</label>
                <input type="number" step="1" name="baseFeeSplit" className="input-field" placeholder="50" defaultValue="50" />
            </div>
            <div className="input-group">
                <label>Gültig ab</label>
                <input type="date" name="validFrom" className="input-field" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <SubmitButton className="btn">Speichern</SubmitButton>
        </form>
    )
}

'use client'

import { useRef } from 'react'
import { addReading } from "@/app/actions"
import { SubmitButton } from "@/app/components/SubmitButton"
import { toast } from "sonner"

export default function ReadingsForm() {
    const formRef = useRef(null)

    async function clientAction(formData) {
        try {
            const result = await addReading(formData)
            if (result && result.success) {
                toast.success('Zählerstand gespeichert! 📈')
                formRef.current?.reset()
                // Reset date to today after submit if needed, or keep blank. 
                // Creating a new Date string again for manual reset might be needed if we want to keep it filled.
                // For now, simple reset is fine.
            } else if (result && result.error) {
                toast.error('Fehler: ' + result.error)
            }
        } catch (e) {
            toast.error('Ein unerwarteter Fehler ist aufgetreten.')
        }
    }

    return (
        <form ref={formRef} action={clientAction} className="responsive-form-grid">
            <div className="input-group">
                <label>Datum</label>
                <input type="date" name="date" className="input-field" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="input-group">
                <label>HT Zählerstand (kWh)</label>
                <input type="number" step="0.1" name="valueHT" className="input-field" required />
            </div>
            <div className="input-group">
                <label>NT Zählerstand (kWh)</label>
                <input type="number" step="0.1" name="valueNT" className="input-field" required />
            </div>
            <div className="input-group">
                <label>Kommentar</label>
                <input type="text" name="comment" className="input-field" />
            </div>
            <div className="input-group">
                <SubmitButton className="btn" style={{ width: '100%' }}>Eintragen</SubmitButton>
            </div>
        </form>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { getAvailableBillingPeriodsAction, sendCustomTelegramReport } from '../actions'
import { toast } from 'sonner'

export default function SendReportDialog({ open, onClose }) {
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [periodsData, setPeriodsData] = useState(null)
    const [selectedPeriod, setSelectedPeriod] = useState(null)
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        if (open) {
            loadPeriods()
        }
    }, [open])

    async function loadPeriods() {
        setLoading(true)
        setError('')
        try {
            const result = await getAvailableBillingPeriodsAction()
            if (result.success) {
                setPeriodsData(result.data)
                // Auto-select first suggestion
                if (result.data.periods.length > 0) {
                    setSelectedPeriod(result.data.periods[0].id)
                }
            } else {
                setError(result.error)
            }
        } catch (e) {
            setError('Fehler beim Laden.')
        }
        setLoading(false)
    }

    function getSelectedFromTo() {
        if (!periodsData) return null

        if (selectedPeriod === 'custom') {
            return { fromId: customFrom, toId: customTo }
        }

        const period = periodsData.periods.find(p => p.id === selectedPeriod)
        if (period) {
            return { fromId: period.fromId, toId: period.toId }
        }

        return null
    }

    async function handleSend() {
        setError('')
        const selection = getSelectedFromTo()
        if (!selection || !selection.fromId || !selection.toId) {
            setError('Bitte wähle einen Zeitraum aus.')
            return
        }

        setSending(true)
        try {
            const result = await sendCustomTelegramReport(selection.fromId, selection.toId)
            if (result.success) {
                toast.success(result.warning || 'Report erfolgreich gesendet und abgerechnet! 📤✅')
                onClose()
            } else {
                setError(result.error)
                toast.error(result.error)
            }
        } catch (e) {
            setError('Ein unerwarteter Fehler ist aufgetreten.')
        }
        setSending(false)
    }

    if (!open) return null

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="glass-card" style={{
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
                opacity: 1,
                animation: 'none'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>📊 Report erstellen</h2>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem'
                    }}>✕</button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        Lade verfügbare Perioden...
                    </div>
                ) : periodsData?.message ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        {periodsData.message}
                    </div>
                ) : (
                    <>
                        {/* Period Selection */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Abrechnungszeitraum wählen:
                            </label>

                            {periodsData?.periods.map(period => (
                                <label key={period.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    background: selectedPeriod === period.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.3)',
                                    border: selectedPeriod === period.id ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    marginBottom: '0.5rem',
                                    transition: 'all 0.2s'
                                }}>
                                    <input
                                        type="radio"
                                        name="period"
                                        checked={selectedPeriod === period.id}
                                        onChange={() => setSelectedPeriod(period.id)}
                                        style={{ accentColor: 'var(--primary)' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{period.label}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {new Date(period.fromDate).toLocaleDateString('de-DE')} → {new Date(period.toDate).toLocaleDateString('de-DE')}
                                        </div>
                                    </div>
                                </label>
                            ))}

                            {/* Custom option */}
                            {periodsData?.unbilledReadings.length > 0 && periodsData?.fromReading && (
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    background: selectedPeriod === 'custom' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.3)',
                                    border: selectedPeriod === 'custom' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    marginBottom: '0.5rem',
                                    transition: 'all 0.2s'
                                }}>
                                    <input
                                        type="radio"
                                        name="period"
                                        checked={selectedPeriod === 'custom'}
                                        onChange={() => setSelectedPeriod('custom')}
                                        style={{ accentColor: 'var(--primary)' }}
                                    />
                                    <div style={{ fontWeight: 500 }}>Benutzerdefiniert</div>
                                </label>
                            )}

                            {/* Custom Dropdowns */}
                            {selectedPeriod === 'custom' && periodsData?.fromReading && (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px' }}>
                                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                                        <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Von (Referenz-Zählerstand):</label>
                                        <select
                                            className="input-field"
                                            value={customFrom}
                                            onChange={e => setCustomFrom(e.target.value)}
                                        >
                                            <option value="">Bitte wählen...</option>
                                            <option value={periodsData.fromReading.id}>
                                                {new Date(periodsData.fromReading.date).toLocaleDateString('de-DE')} — HT: {periodsData.fromReading.valueHT} / NT: {periodsData.fromReading.valueNT}
                                            </option>
                                        </select>
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Bis:</label>
                                        <select
                                            className="input-field"
                                            value={customTo}
                                            onChange={e => setCustomTo(e.target.value)}
                                        >
                                            <option value="">Bitte wählen...</option>
                                            {periodsData.unbilledReadings.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {new Date(r.date).toLocaleDateString('de-DE')} — HT: {r.valueHT} / NT: {r.valueNT}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Preview */}
                        {getSelectedFromTo() && getSelectedFromTo().fromId && getSelectedFromTo().toId && (
                            <div style={{
                                padding: '1rem',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '8px',
                                marginBottom: '1.5rem',
                                fontSize: '0.875rem'
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--success)' }}>✅ Bereit zum Senden</div>
                                <div style={{ color: 'var(--text-muted)' }}>
                                    Der Report wird an Telegram gesendet und die Zählerstände als abgerechnet markiert.
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                color: '#ef4444',
                                marginBottom: '1rem',
                                fontSize: '0.875rem'
                            }}>
                                ❌ {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={handleSend}
                                className="btn"
                                disabled={sending || !getSelectedFromTo()?.fromId || !getSelectedFromTo()?.toId}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    opacity: sending ? 0.7 : 1
                                }}
                            >
                                {sending ? 'Sende...' : '📤 Report senden'}
                            </button>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-muted)',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Abbrechen
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

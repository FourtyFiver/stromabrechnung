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
                toast.success(result.warning || 'Report erfolgreich gesendet! 📤✅')
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
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeInUp 0.2s ease-out'
        }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div style={{
                maxWidth: '480px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
                background: 'rgba(17, 24, 39, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.75rem',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)',
                opacity: 1,
                animation: 'fadeInUp 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.15rem' }}>📊 Report erstellen</h2>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-dim)',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        padding: '0.3rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'all 0.2s',
                        lineHeight: 1
                    }}>✕</button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.75rem' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        <div>Lade verfügbare Perioden...</div>
                    </div>
                ) : periodsData?.message ? (
                    <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                        <div className="empty-icon">📋</div>
                        <p>{periodsData.message}</p>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Abrechnungszeitraum
                            </label>

                            {periodsData?.periods.map(period => (
                                <label key={period.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.7rem 0.85rem',
                                    background: selectedPeriod === period.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                    border: `1px solid ${selectedPeriod === period.id ? 'rgba(59, 130, 246, 0.3)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    marginBottom: '0.4rem',
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
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{period.label}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                            {new Date(period.fromDate).toLocaleDateString('de-DE')} → {new Date(period.toDate).toLocaleDateString('de-DE')}
                                        </div>
                                    </div>
                                </label>
                            ))}

                            {periodsData?.unbilledReadings.length > 0 && periodsData?.fromReading && (
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.7rem 0.85rem',
                                    background: selectedPeriod === 'custom' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                    border: `1px solid ${selectedPeriod === 'custom' ? 'rgba(59, 130, 246, 0.3)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    marginBottom: '0.4rem',
                                    transition: 'all 0.2s'
                                }}>
                                    <input
                                        type="radio"
                                        name="period"
                                        checked={selectedPeriod === 'custom'}
                                        onChange={() => setSelectedPeriod('custom')}
                                        style={{ accentColor: 'var(--primary)' }}
                                    />
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Benutzerdefiniert</div>
                                </label>
                            )}

                            {selectedPeriod === 'custom' && periodsData?.fromReading && (
                                <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                    <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                                        <label>Von (Referenz-Zählerstand)</label>
                                        <select className="input-field" value={customFrom} onChange={e => setCustomFrom(e.target.value)}>
                                            <option value="">Bitte wählen...</option>
                                            <option value={periodsData.fromReading.id}>
                                                {new Date(periodsData.fromReading.date).toLocaleDateString('de-DE')} — HT: {periodsData.fromReading.valueHT} / NT: {periodsData.fromReading.valueNT}
                                            </option>
                                        </select>
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Bis</label>
                                        <select className="input-field" value={customTo} onChange={e => setCustomTo(e.target.value)}>
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

                        {getSelectedFromTo() && getSelectedFromTo().fromId && getSelectedFromTo().toId && (
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: '1rem',
                                fontSize: '0.8rem'
                            }}>
                                <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.15rem' }}>✅ Bereit zum Senden</div>
                                <div style={{ color: 'var(--text-muted)' }}>Report wird an Telegram gesendet & Zählerstände als abgerechnet markiert.</div>
                            </div>
                        )}

                        {error && (
                            <div style={{
                                padding: '0.6rem 0.85rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--danger)',
                                marginBottom: '1rem',
                                fontSize: '0.8rem'
                            }}>
                                ❌ {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <button
                                onClick={handleSend}
                                className="btn"
                                disabled={sending || !getSelectedFromTo()?.fromId || !getSelectedFromTo()?.toId}
                                style={{ flex: 1 }}
                            >
                                {sending ? (
                                    <>
                                        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                        Sende...
                                    </>
                                ) : '📤 Report senden'}
                            </button>
                            <button onClick={onClose} className="btn btn-outline">
                                Abbrechen
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

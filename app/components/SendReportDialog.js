'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getAvailableBillingPeriodsAction, sendCustomTelegramReport, getReportPreviewAction, sendWhatsAppReportAction } from '../actions'
import { toast } from 'sonner'

/**
 * Rendert WhatsApp/Telegram-Markdown (*bold*, _italic_) für die Vorschau.
 * Zeigt exakt das, was später im Chat ankommt.
 */
function renderMessageText(text) {
    const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_)/g)
    return parts.map((part, i) => {
        if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
            return <strong key={i}>{part.slice(1, -1)}</strong>
        }
        if (part.length > 2 && part.startsWith('_') && part.endsWith('_')) {
            return <em key={i}>{part.slice(1, -1)}</em>
        }
        return <span key={i}>{part}</span>
    })
}

export default function SendReportDialog({ open, onClose }) {
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [periodsData, setPeriodsData] = useState(null)
    const [selectedPeriod, setSelectedPeriod] = useState(null)
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')
    const [error, setError] = useState('')
    // Simulation (Vorschau)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [preview, setPreview] = useState(null)
    const [previewError, setPreviewError] = useState('')
    // Fallback-Link, falls der Browser window.open blockt
    const [pendingWhatsAppUrl, setPendingWhatsAppUrl] = useState(null)

    // iOS: Hintergrund-Scroll sperren, solange der Dialog offen ist — sonst
    // scrollt Safari die glass-cards visuell ÜBER das fixed Overlay.
    useEffect(() => {
        if (!open) return
        const { overflow, touchAction } = document.body.style
        document.body.style.overflow = 'hidden'
        document.body.style.touchAction = 'none'
        return () => {
            document.body.style.overflow = overflow
            document.body.style.touchAction = touchAction
        }
    }, [open])

    useEffect(() => {
        if (open) {
            loadPeriods()
        } else {
            // Dialog geschlossen: Simulation & Fehler zurücksetzen
            setPreview(null)
            setPreviewError('')
            setPendingWhatsAppUrl(null)
        }
    }, [open])

    async function loadPeriods() {
        setLoading(true)
        setError('')
        setPreview(null)
        setPreviewError('')
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

    // Simulation: bei Periodenwechsel neu laden (lesend, kein Booking)
    useEffect(() => {
        if (!open || loading || !periodsData) return
        const selection = getSelectedFromTo()
        if (!selection || !selection.fromId || !selection.toId) {
            setPreview(null)
            setPreviewError('')
            return
        }
        let cancelled = false
        setPreviewLoading(true)
        setPreviewError('')
        getReportPreviewAction(selection.fromId, selection.toId)
            .then(result => {
                if (cancelled) return
                if (result.success) {
                    setPreview(result.data)
                } else {
                    setPreview(null)
                    setPreviewError(result.error)
                }
            })
            .catch(() => {
                if (!cancelled) setPreviewError('Fehler beim Laden der Simulation.')
            })
            .finally(() => {
                if (!cancelled) setPreviewLoading(false)
            })
        return () => { cancelled = true }
    }, [open, loading, selectedPeriod, customFrom, customTo, periodsData])

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

    async function handleSendWhatsApp() {
        setError('')
        const selection = getSelectedFromTo()
        if (!selection || !selection.fromId || !selection.toId) {
            setError('Bitte wähle einen Zeitraum aus.')
            return
        }
        if (!preview?.whatsapp?.configured) {
            setError('Keine WhatsApp-Nummer gespeichert. Bitte in den Einstellungen hinterlegen.')
            return
        }

        sendWhatsAppViaScheme(selection)
    }

    /**
     * Gesture-purer WhatsApp-Versand: Der Klick navigiert SYNCRON zum
     * whatsapp://-Scheme (iOS verliert sonst die User-Gesture beim
     * Server-Roundtrip und blockt window.open still). Die Buchung läuft
     * parallel fire-and-forget auf dem Server — sie passiert dort VOR dem
     * WhatsApp-Öffnen (SendWhatsAppReportAction), Semantik bleibt gleich.
     * Falls WhatsApp den Scheme nicht kann (Desktop / nicht installiert):
     * nach 2s Fallback-Link im Dialog anbieten.
     */
    function sendWhatsAppViaScheme(selection) {
        const wa = preview?.whatsapp || {}
        const schemeUrl = wa.sendSchemeUrl
        const httpsUrl = wa.sendHttpsUrl
        if (!schemeUrl && !httpsUrl) {
            setError('WhatsApp-Link konnte nicht erzeugt werden.')
            return
        }
        setSending(true)

        // 1) Schema-URL SOFORT im Gesture-Kontext
        window.location.href = schemeUrl || httpsUrl

        // 2) Buchung parallel anstoßen ( kein mode mehr — Dialog-Buttons buchen immer)
        const booking = sendWhatsAppReportAction(selection.fromId, selection.toId, 'send')
            .then(result => {
                if (!result.success) {
                    setError(result.error || 'Buchung fehlgeschlagen.')
                    toast.error(result.error || 'Buchung fehlgeschlagen.')
                    return
                }
                toast.success('Zeitraum gebucht — WhatsApp öffnet sich, dort nur noch auf Senden tippen. 📲')
                onClose()
            })
            .catch(() => {
                setError('Ein unerwarteter Fehler ist aufgetreten.')
            })
            .finally(() => {
                setSending(false)
            })

        // 3) Fallback: Ist nach 2s noch ein WhatsApp-Fenster offen? Wenn die
        //    Seite noch sichtbar ist (kein WhatsApp-Handoff), HTTPS-Link zeigen.
        setTimeout(() => {
            if (document.visibilityState === 'visible' && httpsUrl) {
                setPendingWhatsAppUrl(httpsUrl)
            }
        }, 2000)

        return booking
    }


    if (!open) return null

    // Portal ins document.body: Der Dialog liegt OUTSIDE jeder .glass-card.
    // backdrop-filter-Cards erzeugen auf iOS eigene Stacking-Contexte — ein fixed
    // Overlay INNERHALB einer Card liegt immer UNTER fremden Cards (Status-Card).
    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left))',
            zIndex: 9999,
            // iOS Safari: backdrop-filter-Karten (.glass-card) erzeugen eigene
            // Stacking-Contexte und können ohne isolate+translateZ ÜBER das fixed
            // Overlay compositen — Dialog absichtlich isoliert + eigener Layer.
            isolation: 'isolate',
            transform: 'translateZ(0)'
        }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div style={{
                maxWidth: '480px',
                width: 'min(100%, 480px)',
                maxHeight: 'min(88dvh, 720px)',
                background: 'rgba(17, 24, 39, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.25rem',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)',
                opacity: 1,
                animation: 'fadeInUp 0.3s ease-out',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '0.5rem 0.5rem 0 0.5rem', flexShrink: 0 }}>
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

                <div style={{ overflowY: 'auto', padding: '0.25rem 0.5rem 0', minHeight: 0, flex: 1 }}>
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
                                        onChange={() => { setSelectedPeriod(period.id); setPendingWhatsAppUrl(null) }}
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
                                        onChange={() => { setSelectedPeriod('custom'); setPendingWhatsAppUrl(null) }}
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

                            {/* Simulation */}
                            {getSelectedFromTo()?.fromId && getSelectedFromTo()?.toId && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        🔍 Simulation — so kommt die Nachricht an
                                    </label>
                                    {previewLoading ? (
                                        <div style={{ textAlign: 'center', padding: '1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '0.4rem' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                            Berechne Simulation...
                                        </div>
                                    ) : previewError ? (
                                        <div style={{
                                            padding: '0.6rem 0.85rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: 'var(--radius-sm)',
                                            color: 'var(--danger)',
                                            fontSize: '0.8rem'
                                        }}>
                                            ❌ {previewError}
                                        </div>
                                    ) : preview?.message ? (
                                        <>
                                            {/* WhatsApp-Style Bubble */}
                                            <div style={{
                                                background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.12), rgba(18, 140, 126, 0.16))',
                                                border: '1px solid rgba(37, 211, 102, 0.25)',
                                                borderRadius: '12px',
                                                padding: '0.85rem 1rem',
                                                fontSize: '0.85rem',
                                                lineHeight: 1.55,
                                                whiteSpace: 'pre-wrap',
                                                marginBottom: preview.whatsapp?.warning ? '0.5rem' : '0.75rem'
                                            }}>
                                                {renderMessageText(preview.message)}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                                                {preview.whatsapp?.configured
                                                    ? `📲 Empfänger: +${preview.whatsapp.formattedNumber}`
                                                    : '📲 WhatsApp-Empfänger noch nicht gesetzt (Einstellungen) — Telegram-Versand möglich.'}
                                            </div>
                                            {preview.whatsapp?.warning && (
                                                <div style={{
                                                    padding: '0.6rem 0.85rem',
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    color: 'var(--warning, #f59e0b)',
                                                    fontSize: '0.78rem',
                                                    marginBottom: '0.75rem'
                                                }}>
                                                    ⚠️ {preview.whatsapp.warning}
                                                </div>
                                            )}
                                        </>
                                    ) : null}
                                </div>
                            )}

                            {getSelectedFromTo() && getSelectedFromTo().fromId && getSelectedFromTo().toId && !previewError && (
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: '1rem',
                                    fontSize: '0.8rem'
                                }}>
                                    <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.15rem' }}>✅ Bereit zum Senden</div>
                                    <div style={{ color: 'var(--text-muted)' }}>
                                        Versand per Telegram oder WhatsApp — danach werden die Zählerstände als abgerechnet markiert.
                                    </div>
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

                            {pendingWhatsAppUrl && (
                                <div style={{
                                    padding: '0.85rem 1rem',
                                    background: 'rgba(37, 211, 102, 0.1)',
                                    border: '1px solid rgba(37, 211, 102, 0.3)',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: '1rem',
                                    fontSize: '0.85rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ marginBottom: '0.5rem' }}>✅ Zeitraum gebucht. Popup blockiert?</div>
                                    <a href={pendingWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{
                                        background: 'linear-gradient(135deg, #25D366, #128C7E)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        textDecoration: 'none'
                                    }}>
                                        📲 WhatsApp öffnen
                                    </a>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!loading && !periodsData?.message && (
                    <div style={{
                        display: 'flex',
                        gap: '0.6rem',
                        padding: '1rem 0.5rem 0.5rem',
                        borderTop: '1px solid var(--border)',
                        background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.2), rgba(17, 24, 39, 0.96))',
                        flexShrink: 0,
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={() => handleSendWhatsApp()}
                            disabled={sending || !preview?.whatsapp?.configured || !getSelectedFromTo()?.fromId || !getSelectedFromTo()?.toId}
                            className="btn"
                            style={{
                                flex: '1 1 200px',
                                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.45rem'
                            }}
                        >
                            {sending ? (
                                <>
                                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                    Sende...
                                </>
                            ) : '📲 Per WhatsApp senden'}
                        </button>
                        <button
                            onClick={() => handleSend()}
                            disabled={sending || !getSelectedFromTo()?.fromId || !getSelectedFromTo()?.toId}
                            className="btn"
                            style={{
                                flex: '1 1 180px',
                                background: 'linear-gradient(135deg, #2AABEE, #229ED9)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.45rem'
                            }}
                        >
                            📤 Per Telegram senden
                        </button>
                        <button onClick={onClose} className="btn btn-outline" style={{ flex: '1 1 100px' }}>
                            Abbrechen
                        </button>
                    </div>
                )}
            </div>
        </div>
    , document.body)
}
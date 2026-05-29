'use client'

import { useState } from 'react'
import { markPdfGenerated } from '@/app/actions'
import { toast } from 'sonner'

function getFilenameFromDisposition(contentDisposition, fallbackName) {
    if (!contentDisposition) {
        return fallbackName
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1])
    }

    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
    return filenameMatch?.[1] || fallbackName
}

export default function PdfDownloadButton({ billPeriod }) {
    const [loading, setLoading] = useState(false)
    const [pdfGenerated, setPdfGenerated] = useState(billPeriod.pdfGenerated)

    async function handleDownload() {
        setLoading(true)
        try {
            const response = await fetch(`/api/billing-history/${billPeriod.id}/pdf`, {
                method: 'GET',
                cache: 'no-store'
            })

            if (!response.ok) {
                throw new Error('PDF download failed')
            }

            const pdfBlob = await response.blob()
            const objectUrl = URL.createObjectURL(pdfBlob)
            const fallbackName = `stromabrechnung_${new Date(billPeriod.fromDate).toLocaleDateString('de-DE').replace(/\./g, '-')}_${new Date(billPeriod.toDate).toLocaleDateString('de-DE').replace(/\./g, '-')}.pdf`
            const filename = getFilenameFromDisposition(response.headers.get('content-disposition'), fallbackName)

            // Create a download link
            const link = document.createElement('a')
            link.href = objectUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(objectUrl)

            // Mark as generated
            if (!pdfGenerated) {
                const result = await markPdfGenerated(billPeriod.id)
                if (result.success) {
                    setPdfGenerated(true)
                }
            }

            toast.success('PDF heruntergeladen.')
        } catch (e) {
            console.error('PDF generation error:', e)
            toast.error('Fehler beim Herunterladen des PDFs.')
        }
        setLoading(false)
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
            {pdfGenerated && (
                <span className="badge badge-success">PDF erstellt</span>
            )}
            <button
                onClick={handleDownload}
                disabled={loading}
                title={pdfGenerated ? 'PDF erneut herunterladen' : 'Als PDF herunterladen'}
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: loading ? 'wait' : 'pointer',
                    color: loading ? 'var(--text-dim)' : 'var(--primary-light)',
                    padding: '0.35rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
                {loading ? (
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" /></svg>
                )}
            </button>
        </div>
    )
}
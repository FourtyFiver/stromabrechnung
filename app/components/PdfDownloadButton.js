'use client'

import { useState } from 'react'
import { generateBillingPDF } from '@/lib/pdf-generator'
import { markPdfGenerated } from '@/app/actions'
import { toast } from 'sonner'

export default function PdfDownloadButton({ billPeriod }) {
    const [loading, setLoading] = useState(false)
    const [pdfGenerated, setPdfGenerated] = useState(billPeriod.pdfGenerated)

    async function handleDownload() {
        setLoading(true)
        try {
            const dataUri = await generateBillingPDF(billPeriod)

            // Create a download link
            const link = document.createElement('a')
            link.href = dataUri
            const fromDate = new Date(billPeriod.fromDate).toLocaleDateString('de-DE').replace(/\./g, '-')
            const toDate = new Date(billPeriod.toDate).toLocaleDateString('de-DE').replace(/\./g, '-')
            link.download = `Stromabrechnung_${fromDate}_${toDate}.pdf`
            link.click()

            // Mark as generated
            if (!pdfGenerated) {
                const result = await markPdfGenerated(billPeriod.id)
                if (result.success) {
                    setPdfGenerated(true)
                }
            }

            toast.success('PDF generiert! 📄')
        } catch (e) {
            console.error('PDF generation error:', e)
            toast.error('Fehler beim Generieren des PDFs.')
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
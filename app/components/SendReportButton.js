'use client'

import { useState } from 'react'
import SendReportDialog from './SendReportDialog'

export default function SendReportButton() {
    const [dialogOpen, setDialogOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setDialogOpen(true)}
                className="btn"
                style={{
                    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                📊 Report erstellen
            </button>
            <SendReportDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
        </>
    )
}

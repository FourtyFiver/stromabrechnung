'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({ children, className, style }) {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            className={className}
            style={style}
            disabled={pending}
        >
            {pending ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Speichere...
                </span>
            ) : (
                children
            )}
        </button>
    )
}

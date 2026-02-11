'use client'

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        setError("")

        const username = e.target.username.value
        const password = e.target.password.value

        const res = await signIn("credentials", {
            username,
            password,
            redirect: false,
        })

        if (res.error) {
            setError("Ungültige Zugangsdaten")
            setLoading(false)
        } else {
            router.refresh()
            router.replace("/")
        }
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh'
        }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚡</div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>StromPortal</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', margin: 0 }}>Melden Sie sich an, um fortzufahren</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Benutzername</label>
                        <input type="text" name="username" className="input-field" required placeholder="admin" autoComplete="username" />
                    </div>

                    <div className="input-group">
                        <label>Passwort</label>
                        <input type="password" name="password" className="input-field" required placeholder="•••••••" autoComplete="current-password" />
                    </div>

                    {error && (
                        <div style={{
                            color: 'var(--danger)',
                            fontSize: '0.85rem',
                            marginBottom: '1rem',
                            textAlign: 'center',
                            padding: '0.6rem 1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: 'var(--radius-sm)'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn"
                        style={{ width: '100%', padding: '0.8rem' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                Anmelden...
                            </>
                        ) : 'Einloggen'}
                    </button>
                </form>
            </div>
        </div>
    )
}

'use client'

import { signIn } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginForm({ ssoEnabled }) {
    const router = useRouter()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    // Auto-SSO. Trigger:
    //   1. ?sso=1 (explizite Launch URL)
    //   2. ?callbackUrl=... (Middleware-Redirect beim Klick auf die Authentik-Kachel,
    //      die auf / zeigt) — ohne eigene Session landet man so direkt im SSO-Flow.
    // Kein Loop: Bei OIDC-Fehler kommt /login?error=... zurück — kein Auto-SSO,
    // das Credentials-Formular bleibt sichtbar.
    useEffect(() => {
        if (!ssoEnabled) return
        const params = new URLSearchParams(window.location.search)
        const hasError = params.has("error")
        const viaKachel = params.has("callbackUrl")
        if (params.get("sso") === "1" || (viaKachel && !hasError)) {
            signIn("authentik", { callbackUrl: "/" })
        }
    }, [ssoEnabled])

    // Manueller SSO-Button: ebenfalls direkt aufs Dashboard.
    function handleSsoClick() {
        signIn("authentik", { callbackUrl: "/" })
    }

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
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>StromApp</h1>
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

                {ssoEnabled && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>oder</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline"
                            style={{ width: '100%', padding: '0.8rem' }}
                            onClick={handleSsoClick}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></svg>
                            Mit Authentik anmelden
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
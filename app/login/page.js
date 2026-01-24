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
            // Refresh to update server components with new session
            router.refresh()
            // Navigate to dashboard replacing the history entry
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
                <h1 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem' }}>Login</h1>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Benutzername</label>
                        <input type="text" name="username" className="input-field" required placeholder="admin" />
                    </div>

                    <div className="input-group">
                        <label>Passwort</label>
                        <input type="password" name="password" className="input-field" required placeholder="•••••••" />
                    </div>

                    {error && (
                        <div style={{
                            color: '#ef4444',
                            fontSize: '0.9rem',
                            marginBottom: '1rem',
                            textAlign: 'center',
                            padding: '0.5rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '8px'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'Anmelden...' : 'Einloggen'}
                    </button>
                </form>
            </div>
        </div>
    )
}

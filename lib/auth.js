import CredentialsProvider from "next-auth/providers/credentials"
import AuthentikProvider from "next-auth/providers/authentik"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"
import { createHash, timingSafeEqual } from "crypto"
import { createRateLimiter } from "@/lib/rate-limit"

const INSECURE_DEFAULTS = ['admin123', 'secure_password_please_change', 'password', 'admin']

// Login-Rate-Limit: 5 Fehlversuche pro 15 Minuten, getrennt je IP und je Benutzername.
// globalThis, damit der Zustand Next-Dev-Modul-Reloads ueberlebt.
const g = globalThis
const ipLimiter = (g.__loginIpLimiter ??= createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }))
const userLimiter = (g.__loginUserLimiter ??= createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }))

function clientIp(req) {
    const h = req?.headers
    const get = (n) => (typeof h?.get === 'function' ? h.get(n) : h?.[n])
    // X-Forwarded-For ist vom Client faelschbar: nur hinter einem vertrauenswuerdigen
    // Reverse-Proxy beachten (TRUST_PROXY=1), sonst wuerde jede Anfrage das Limit umgehen.
    if (process.env.TRUST_PROXY === '1') {
        const fwd = get('x-forwarded-for')
        const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim()
        if (first) return first
    }
    return get('x-real-ip') || 'unknown'
}

function safeEqual(a, b) {
    const ha = createHash('sha256').update(String(a)).digest()
    const hb = createHash('sha256').update(String(b)).digest()
    return timingSafeEqual(ha, hb)
}

// OIDC-Provider (Authentik) nur aktivieren, wenn konfiguriert.
// Ohne Env-Vars verhält sich die App exakt wie vorher (Credentials-only).
const authentikEnabled = Boolean(process.env.AUTHENTIK_ID && process.env.AUTHENTIK_SECRET && process.env.AUTHENTIK_ISSUER)

async function verifyCredentials(credentials) {
    // Check against Environment Variables first (Admin)
    const envUser = process.env.ADMIN_USERNAME
    const envPass = process.env.ADMIN_PASSWORD

    if (envUser && envPass) {
        const userOk = safeEqual(credentials.username, envUser)
        const passOk = safeEqual(credentials.password, envPass)
        if (userOk && passOk) {
            // Warn in logs if using an insecure default password
            if (INSECURE_DEFAULTS.includes(envPass)) {
                console.warn('⚠️  SECURITY WARNING: ADMIN_PASSWORD is set to a known default value. Please change it in .env!')
            }
            return { id: 'admin-env', name: envUser, email: 'admin@local' }
        }
    }

    // Fallback to Database User
    const user = await prisma.user.findUnique({
        where: { username: credentials.username }
    })

    if (!user) return null

    const isValid = await bcrypt.compare(credentials.password, user.password)

    if (!isValid) return null

    return { id: user.id, name: user.username }
}

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "admin" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                if (!credentials?.username || !credentials?.password) return null

                const ipKey = 'ip:' + clientIp(req)
                const userKey = 'user:' + String(credentials.username).toLowerCase().slice(0, 100)

                // Versuch VOR dem DB-/bcrypt-Zugriff reservieren (parallele Bursts), bei Erfolg zuruecksetzen
                const ipCheck = ipLimiter.reserve(ipKey)
                const userCheck = userLimiter.reserve(userKey)
                if (!ipCheck.allowed || !userCheck.allowed) {
                    if (ipCheck.allowed) ipLimiter.release(ipKey)
                    if (userCheck.allowed) userLimiter.release(userKey)
                    const ms = Math.max(ipCheck.retryAfterMs, userCheck.retryAfterMs)
                    throw new Error('RATE_LIMITED:' + Math.max(1, Math.ceil(ms / 60000)))
                }

                const user = await verifyCredentials(credentials)
                if (user) {
                    ipLimiter.reset(ipKey)
                    userLimiter.reset(userKey)
                    return user
                }
                return null
            }
        }),

        // Authentik OIDC (SSO) — optional aktiv
        ...(authentikEnabled ? [AuthentikProvider({
            clientId: process.env.AUTHENTIK_ID,
            clientSecret: process.env.AUTHENTIK_SECRET,
            issuer: process.env.AUTHENTIK_ISSUER
        })] : [])
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // JWT/Session-Cookie gilt 30 Tage (persistent, ueberlebt Browser-Neustart)
    },

    pages: {
        signIn: '/login', // Custom login page
    },
    callbacks: {
        async jwt({ token, account, profile }) {
            // Bei OIDC-Login: Nutzername aus Authentik übernehmen (preferred_username)
            if (account?.provider === "authentik" && profile?.preferred_username) {
                token.name = profile.preferred_username
            }
            return token
        },
        async session({ session, token }) {
            session.user.id = token.sub
            return session
        }
    }
}
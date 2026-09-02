import CredentialsProvider from "next-auth/providers/credentials"
import AuthentikProvider from "next-auth/providers/authentik"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"

const INSECURE_DEFAULTS = ['admin123', 'secure_password_please_change', 'password', 'admin']

// OIDC-Provider (Authentik) nur aktivieren, wenn konfiguriert.
// Ohne Env-Vars verhält sich die App exakt wie vorher (Credentials-only).
const authentikEnabled = Boolean(process.env.AUTHENTIK_ID && process.env.AUTHENTIK_SECRET && process.env.AUTHENTIK_ISSUER)

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

                // Check against Environment Variables first (Admin)
                const envUser = process.env.ADMIN_USERNAME
                const envPass = process.env.ADMIN_PASSWORD

                if (envUser && envPass) {
                    if (credentials.username === envUser && credentials.password === envPass) {
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
        maxAge: 30 * 24 * 60 * 60, // Token validity (30 days) - but cookie dies on close
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

import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"

const INSECURE_DEFAULTS = ['admin123', 'secure_password_please_change', 'password', 'admin']

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

                try {
                    // Check against Environment Variables first (Admin)
                    const envUser = process.env.ADMIN_USERNAME || 'admin'
                    const envPass = process.env.ADMIN_PASSWORD || 'admin123'

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

                    if (!user) {
                        console.warn(`[auth] Login failed: no matching environment credentials and no database user found for '${credentials.username}'.`)
                        return null
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.password)

                    if (!isValid) {
                        console.warn(`[auth] Login failed: invalid password for database user '${credentials.username}'.`)
                        return null
                    }

                    return { id: user.id, name: user.username }
                } catch (error) {
                    console.error('[auth] Login failed with unexpected error:', error)
                    throw error
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // Token validity (30 days) - but cookie dies on close
    },

    pages: {
        signIn: '/login', // Custom login page
    },
    logger: {
        error(code, metadata) {
            console.error('[next-auth][error]', code, metadata)
        },
        warn(code) {
            console.warn('[next-auth][warn]', code)
        },
    },
    callbacks: {
        async session({ session, token }) {
            session.user.id = token.sub
            return session
        }
    }
}

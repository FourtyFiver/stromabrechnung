import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"

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
                const envUser = process.env.ADMIN_USERNAME || 'admin'
                const envPass = process.env.ADMIN_PASSWORD || 'admin123'

                if (envUser && envPass) {
                    // Debug logs for troubleshooting
                    console.log(`[Auth] Checking env credentials.`)
                    console.log(`[Auth] Input User: '${credentials.username}' vs Env User: '${envUser}'`)
                    // Safely log lengths to debug special char issues
                    console.log(`[Auth] Input Pass Length: ${credentials.password?.length || 0} vs Env Pass Length: ${envPass?.length || 0}`)

                    if (credentials.username === envUser && credentials.password === envPass) {
                        console.log('[Auth] Admin login via Env successful')
                        return { id: 'admin-env', name: envUser, email: 'admin@local' }
                    } else {
                        console.log('[Auth] Env credentials mismatch')
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
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // Token validity (30 days) - but cookie dies on close
    },
    // Customize cookies to make them session-only (no explicit maxAge in cookie header)
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                // maxAge: not set => session cookie
            }
        },
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production'
            }
        },
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production'
            }
        },
    },
    pages: {
        signIn: '/login', // Custom login page
    },
    callbacks: {
        async session({ session, token }) {
            session.user.id = token.sub
            return session
        }
    }
}

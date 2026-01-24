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
                const envUser = process.env.ADMIN_USERNAME
                const envPass = process.env.ADMIN_PASSWORD

                if (envUser && envPass) {
                    // Debug logs for troubleshooting
                    console.log(`[Auth] Checking env credentials. Input User: '${credentials.username}'`)

                    if (credentials.username === envUser && credentials.password === envPass) {
                        console.log('[Auth] Admin login via Env successful')
                        return { id: 'admin-env', name: envUser, email: 'admin@local' }
                    } else {
                        console.log('[Auth] Env credentials mismatch')
                    }
                } else {
                    console.log('[Auth] No ADMIN_USERNAME/ADMIN_PASSWORD set in env')
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
        strategy: "jwt"
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

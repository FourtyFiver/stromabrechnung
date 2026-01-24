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
        maxAge: 24 * 60 * 60, // 24 hours
        updateAge: 60 * 60, // Update session every hour
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

import LoginForm from "./LoginForm"

// force-dynamic: ENV-Flags (AUTHENTIK_*) müssen zur Laufzeit gelesen werden,
// nicht zur Build-Zeit eingebrannt werden.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
    const ssoEnabled = Boolean(
        process.env.AUTHENTIK_ID &&
        process.env.AUTHENTIK_SECRET &&
        process.env.AUTHENTIK_ISSUER
    )
    return <LoginForm ssoEnabled={ssoEnabled} />
}
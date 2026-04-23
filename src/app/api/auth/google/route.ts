import { type NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
  const scope = 'openid email profile'
  const responseType = 'code'

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id', clientId!)
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.set('scope', scope)
  googleAuthUrl.searchParams.set('response_type', responseType)

  return NextResponse.redirect(googleAuthUrl.toString())
}

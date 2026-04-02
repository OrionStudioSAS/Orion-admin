import { NextRequest, NextResponse } from 'next/server'
import { exchangeGmailCode } from '@/lib/gmail'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 })
  }

  try {
    const tokens = await exchangeGmailCode(code)
    return NextResponse.json({
      message: 'OAuth2 setup successful! Add this refresh_token to your .env.local as GMAIL_REFRESH_TOKEN',
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token exchange failed' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getGmailAuthUrl } from '@/lib/gmail'

export async function GET() {
  try {
    const url = getGmailAuthUrl()
    return NextResponse.redirect(url)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}

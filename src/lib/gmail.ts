import { google } from 'googleapis'

function getOAuth2Client() {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback'
  )
  client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  })
  return client
}

export function isGmailConfigured(): boolean {
  return !!(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  )
}

/**
 * Creates a draft email in Gmail
 */
export async function createGmailDraft(params: {
  to: string
  subject: string
  body: string
  from?: string
}): Promise<{ draftId: string; messageId: string }> {
  const auth = getOAuth2Client()
  const gmail = google.gmail({ version: 'v1', auth })

  const fromHeader = params.from || process.env.GMAIL_FROM_EMAIL || 'me'
  const rawMessage = [
    `From: ${fromHeader}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    params.body,
  ].join('\r\n')

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw: encodedMessage },
    },
  })

  return {
    draftId: res.data.id || '',
    messageId: res.data.message?.id || '',
  }
}

/**
 * Generate Gmail OAuth2 authorization URL (for initial setup)
 */
export function getGmailAuthUrl(): string {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback'
  )
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.compose'],
    prompt: 'consent',
  })
}

/**
 * Exchange authorization code for tokens (for initial setup)
 */
export async function exchangeGmailCode(code: string) {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback'
  )
  const { tokens } = await client.getToken(code)
  return tokens
}

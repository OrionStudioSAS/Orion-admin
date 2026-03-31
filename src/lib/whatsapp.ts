function normalizePhone(phone: string): string {
  // Supprime espaces, tirets, parenthèses, points
  let clean = phone.replace(/[\s\-\(\)\.]/g, '')
  // 0033... → +33...
  if (clean.startsWith('00')) clean = '+' + clean.slice(2)
  // 0612... → +33612...  (France par défaut si pas de +)
  if (!clean.startsWith('+') && clean.startsWith('0')) clean = '+33' + clean.slice(1)
  // Ajoute + si absent et commence par des chiffres
  if (!clean.startsWith('+')) clean = '+' + clean
  return clean
}

export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER
  )
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER

  if (!accountSid || !authToken || !from) {
    console.warn('[WhatsApp] Variables Twilio manquantes — notification ignorée')
    return
  }

  const to = normalizePhone(phone)

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:${from}`,
        To: `whatsapp:${to}`,
        Body: message,
      }).toString(),
    }
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || `Twilio error ${response.status}`)
  }
}

// Messages prédéfinis
export function notifNewFile(firstName: string, fileName: string, category: string): string {
  const catLabel = { resource: 'document', invoice: 'facture', quote: 'devis' }[category] ?? 'fichier'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `👋 Bonjour ${firstName},\n\nUn nouveau ${catLabel} est disponible dans votre espace Orion Studio :\n📄 *${fileName}*\n\nConnectez-vous pour le consulter :\n${appUrl}/project`
}

export function notifStatusChange(firstName: string, status: string): string {
  const labels: Record<string, string> = {
    en_cours: 'En cours 🔵',
    termine: 'Terminé ✅',
    en_pause: 'En pause ⏸️',
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `👋 Bonjour ${firstName},\n\nLe statut de votre projet a été mis à jour : *${labels[status] ?? status}*\n\nConnectez-vous pour voir les détails :\n${appUrl}/project`
}

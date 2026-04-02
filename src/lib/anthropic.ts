import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ProspectContext {
  company_name: string
  contact_name: string | null
  email: string | null
  sector: string | null
  notes: string | null
  website: string | null
}

export async function generateProspectionEmail(
  prospect: ProspectContext,
  type: 'first_contact' | 'follow_up'
): Promise<{ subject: string; body: string }> {
  const senderName = process.env.PROSPECTION_SENDER_NAME || 'Thomas'
  const senderCompany = process.env.PROSPECTION_SENDER_COMPANY || 'Orion Studio'
  const senderTitle = process.env.PROSPECTION_SENDER_TITLE || 'Co-fondateur'

  const systemPrompt = `Tu es un assistant commercial expert en rédaction d'emails de prospection B2B pour ${senderCompany}.

Règles :
- Ton professionnel mais chaleureux et humain, pas corporate
- Court et percutant (max 150 mots pour le corps)
- Personnalisé au contexte du prospect
- Pas de formulations génériques type "je me permets de vous contacter"
- Inclure un CTA clair (proposition d'appel ou de rendez-vous)
- Signature : ${senderName} — ${senderTitle}, ${senderCompany}
- Format HTML simple (paragraphes <p>, pas de styles inline complexes)
- Ne pas utiliser de gras excessif

Réponds UNIQUEMENT en JSON avec cette structure exacte :
{"subject": "...", "body": "..."}`

  const userPrompt = type === 'first_contact'
    ? `Rédige un email de premier contact pour ce prospect :
- Entreprise : ${prospect.company_name}
- Contact : ${prospect.contact_name || 'Non renseigné'}
- Secteur : ${prospect.sector || 'Non renseigné'}
- Site web : ${prospect.website || 'Non renseigné'}
- Notes : ${prospect.notes || 'Aucune'}

L'email doit montrer qu'on a étudié leur activité et proposer un échange.`
    : `Rédige un email de relance pour ce prospect qu'on a contacté il y a 1 semaine sans réponse :
- Entreprise : ${prospect.company_name}
- Contact : ${prospect.contact_name || 'Non renseigné'}
- Secteur : ${prospect.sector || 'Non renseigné'}
- Site web : ${prospect.website || 'Non renseigné'}
- Notes : ${prospect.notes || 'Aucune'}

L'email doit être plus court que le premier, rappeler brièvement notre proposition, et proposer un dernier créneau.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const json = JSON.parse(text)
  return { subject: json.subject, body: json.body }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Prospect } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Accès refusé')
  return { user, admin }
}

export async function createProspect(data: {
  company_name: string
  contact_name?: string
  email?: string
  phone?: string
  linkedin_url?: string
  website?: string
  sector?: string
  location?: string
  source?: string
  channel?: 'email' | 'cold_call'
  notes?: string
}) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('prospects').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/prospection')
}

export async function updateProspect(id: string, data: Partial<Prospect>) {
  const { admin } = await requireAdmin()
  await admin.from('prospects').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/admin/prospection')
}

export async function deleteProspect(id: string) {
  const { admin } = await requireAdmin()
  await admin.from('prospects').delete().eq('id', id)
  revalidatePath('/admin/prospection')
}

export async function convertProspect(prospectId: string) {
  const { admin } = await requireAdmin()
  await admin.from('prospects').update({ status: 'converti', updated_at: new Date().toISOString() }).eq('id', prospectId)
  revalidatePath('/admin/prospection')
}

export async function generateProspectEmail(prospectId: string, type: 'first_contact' | 'follow_up'): Promise<{ success: true; draftId: string; subject: string } | { success: false; error: string }> {
  try {
    const { admin } = await requireAdmin()

    const { data: prospect } = await admin.from('prospects').select('*').eq('id', prospectId).single()
    if (!prospect) return { success: false, error: 'Prospect introuvable' }
    if (!prospect.email) return { success: false, error: "Ce prospect n'a pas d'adresse email" }

    const { isGmailConfigured } = await import('@/lib/gmail')
    if (!isGmailConfigured()) return { success: false, error: 'Gmail non configuré. Ajoutez GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET et GMAIL_REFRESH_TOKEN dans Vercel.' }

    if (!process.env.ANTHROPIC_API_KEY) return { success: false, error: 'ANTHROPIC_API_KEY non configurée dans Vercel.' }

    const { generateProspectionEmail } = await import('@/lib/anthropic')
    const { subject, body } = await generateProspectionEmail({
      company_name: prospect.company_name,
      contact_name: prospect.contact_name,
      email: prospect.email,
      sector: prospect.sector,
      notes: prospect.notes,
      website: prospect.website,
    }, type)

    const { createGmailDraft } = await import('@/lib/gmail')
    const draft = await createGmailDraft({
      to: prospect.email,
      subject,
      body,
    })

    // Update prospect status
    const newStatus = type === 'first_contact' ? 'contacte' : 'relance'
    await admin.from('prospects').update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', prospectId)

    revalidatePath('/admin/prospection')
    revalidatePath('/admin/overview')

    return { success: true, draftId: draft.draftId, subject }
  } catch (err) {
    console.error('[generateProspectEmail]', err)
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue lors de la génération' }
  }
}

export async function autoExpireProspects() {
  const { admin } = await requireAdmin()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Prospects "relancé" since more than 1 week → "perdu"
  await admin
    .from('prospects')
    .update({ status: 'perdu', updated_at: new Date().toISOString() })
    .eq('status', 'relance')
    .lt('updated_at', oneWeekAgo)

  revalidatePath('/admin/prospection')
  revalidatePath('/admin/overview')
}

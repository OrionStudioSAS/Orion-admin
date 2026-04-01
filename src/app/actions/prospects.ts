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

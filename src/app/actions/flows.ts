'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Accès refusé')
  return { user, admin }
}

export async function createFlow(data: {
  name: string
  description: string
  webhook_url: string
  category: string
  icon: string
  is_active: boolean
}) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('flows').insert({
    name: data.name,
    description: data.description || null,
    webhook_url: data.webhook_url,
    category: data.category,
    icon: data.icon,
    is_active: data.is_active,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flows')
  revalidatePath('/dashboard')
}

export async function updateFlow(id: string, data: {
  name: string
  description: string
  webhook_url: string
  category: string
  icon: string
  is_active: boolean
}) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('flows').update({
    name: data.name,
    description: data.description || null,
    webhook_url: data.webhook_url,
    category: data.category,
    icon: data.icon,
    is_active: data.is_active,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flows')
  revalidatePath('/dashboard')
}

export async function toggleFlowActive(id: string, isActive: boolean) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('flows').update({ is_active: !isActive }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flows')
  revalidatePath('/dashboard')
}

export async function deleteFlow(id: string) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('flows').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flows')
  revalidatePath('/dashboard')
}

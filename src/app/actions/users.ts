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

export async function updateUserRole(profileId: string, role: 'admin' | 'client') {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('profiles').update({ role }).eq('id', profileId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}

export async function grantFlowAccess(profileId: string, flowId: string) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('flow_access').insert({ profile_id: profileId, flow_id: flowId })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}

export async function revokeFlowAccess(profileId: string, flowId: string) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('flow_access').delete()
    .eq('profile_id', profileId).eq('flow_id', flowId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}

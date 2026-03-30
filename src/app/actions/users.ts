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

export async function requestFlowAccess(flowId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  const admin = createAdminClient()
  // Ignore si déjà demandé (contrainte UNIQUE)
  await admin.from('access_requests').upsert(
    { profile_id: user.id, flow_id: flowId, status: 'pending' },
    { onConflict: 'profile_id,flow_id', ignoreDuplicates: true }
  )
  revalidatePath('/dashboard')
}

export async function approveAccessRequest(requestId: string, profileId: string, flowId: string) {
  const { admin } = await requireAdmin()
  // Accorder l'accès
  await admin.from('flow_access').upsert({ profile_id: profileId, flow_id: flowId }, { onConflict: 'profile_id,flow_id', ignoreDuplicates: true })
  // Mettre à jour le statut
  await admin.from('access_requests').update({ status: 'approved' }).eq('id', requestId)
  revalidatePath('/admin/users')
  revalidatePath('/dashboard')
}

export async function rejectAccessRequest(requestId: string) {
  const { admin } = await requireAdmin()
  await admin.from('access_requests').update({ status: 'rejected' }).eq('id', requestId)
  revalidatePath('/admin/users')
}

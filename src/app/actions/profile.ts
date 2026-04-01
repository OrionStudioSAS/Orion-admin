'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateProfile(data: {
  full_name?: string
  company?: string
  website?: string
  webflow_site?: string
  phone?: string
  job_title?: string
  avatar_url?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/profile')
  revalidatePath('/project')
}

export async function uploadAvatar(formData: FormData): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const file = formData.get('file') as File
  if (!file || file.size === 0) throw new Error('Aucun fichier')

  const admin = createAdminClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `avatars/${user.id}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await admin.storage.from('project-files').upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  })
  if (error) throw new Error(error.message)

  const { data: signedData, error: signError } = await admin.storage
    .from('project-files')
    .createSignedUrl(path, 315360000) // ~10 years
  if (signError || !signedData?.signedUrl) throw new Error('Impossible de générer l\'URL de l\'avatar')
  const publicUrl = signedData.signedUrl

  await admin.from('profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', user.id)
  revalidatePath('/profile')
  revalidatePath('/project')
  return publicUrl
}

export async function changePassword(newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
  if (error) throw new Error(error.message)
}

export async function cancelAccessRequest(flowId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const admin = createAdminClient()
  await admin
    .from('access_requests')
    .delete()
    .eq('profile_id', user.id)
    .eq('flow_id', flowId)
    .eq('status', 'pending')

  revalidatePath('/dashboard')
}

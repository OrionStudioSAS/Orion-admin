'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyPasswordReset, notifyProfileUpdated } from '@/lib/notifications'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Accès refusé')
  return { user, admin }
}

export async function updateClientProfile(profileId: string, data: {
  full_name?: string | null
  company?: string | null
  phone?: string | null
  website?: string | null
  job_title?: string | null
  linkedin_url?: string | null
  webflow_site?: string | null
  company_address?: string | null
  siret?: string | null
}) {
  const { admin } = await requireAdmin()
  await admin.from('profiles').update({ ...data, updated_at: new Date().toISOString() }).eq('id', profileId)

  // Notify client
  const { data: profile } = await admin.from('profiles').select('email, full_name').eq('id', profileId).single()
  if (profile?.email) {
    const firstName = (profile.full_name || '').split(' ')[0] || 'vous'
    notifyProfileUpdated(profile.email, firstName)
  }

  revalidatePath(`/admin/clients/${profileId}`)
}

export async function resetClientPassword(userId: string, newPassword: string) {
  const { admin } = await requireAdmin()
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) throw new Error(error.message)

  // Notify client
  const { data: profile } = await admin.from('profiles').select('email, full_name').eq('id', userId).single()
  if (profile?.email) {
    const firstName = (profile.full_name || '').split(' ')[0] || 'vous'
    notifyPasswordReset(profile.email, firstName)
  }
}

export async function addClientLink(profileId: string, name: string, url: string, visibleToClient: boolean) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('client_documents').insert({
    profile_id: profileId,
    type: 'link',
    name,
    url,
    visible_to_client: visibleToClient,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/clients/${profileId}`)
}

export async function uploadClientFile(formData: FormData) {
  const { admin } = await requireAdmin()

  const file = formData.get('file') as File
  const profileId = formData.get('profileId') as string
  const name = formData.get('name') as string
  const visibleToClient = formData.get('visibleToClient') === 'true'

  if (!file || !profileId || !name) throw new Error('Données manquantes')

  const bytes = await file.arrayBuffer()
  const path = `${profileId}/admin/${Date.now()}-${file.name}`

  const { error: storageError } = await admin.storage
    .from('project-files')
    .upload(path, bytes, { contentType: file.type })

  if (storageError) throw new Error(storageError.message)

  const { error: dbError } = await admin.from('client_documents').insert({
    profile_id: profileId,
    type: 'file',
    name,
    storage_path: path,
    original_name: file.name,
    size_bytes: file.size,
    visible_to_client: visibleToClient,
  })

  if (dbError) throw new Error(dbError.message)
  revalidatePath(`/admin/clients/${profileId}`)
}

export async function toggleDocumentVisibility(docId: string, visible: boolean, profileId: string) {
  const { admin } = await requireAdmin()
  await admin.from('client_documents').update({ visible_to_client: visible }).eq('id', docId)
  revalidatePath(`/admin/clients/${profileId}`)
}

export async function deleteClientDocument(docId: string, storagePath: string | null, profileId: string) {
  const { admin } = await requireAdmin()
  if (storagePath) {
    await admin.storage.from('project-files').remove([storagePath])
  }
  await admin.from('client_documents').delete().eq('id', docId)
  revalidatePath(`/admin/clients/${profileId}`)
}

export async function getClientDocUrl(storagePath: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('project-files').createSignedUrl(storagePath, 60 * 10)
  if (error || !data?.signedUrl) throw new Error('Impossible de générer le lien')
  return data.signedUrl
}

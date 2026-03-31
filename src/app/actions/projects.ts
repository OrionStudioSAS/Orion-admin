'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Project } from '@/types/database'
import { sendWhatsAppMessage, notifNewFile, notifStatusChange } from '@/lib/whatsapp'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Accès refusé')
  return { user, admin }
}

export async function upsertProject(profileId: string, data: Partial<Project>) {
  const { admin } = await requireAdmin()

  const { data: existing } = await admin.from('projects').select('id, status').eq('profile_id', profileId).single()
  const prevStatus = existing?.status ?? null

  if (existing) {
    await admin.from('projects').update({ ...data, updated_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await admin.from('projects').insert({ profile_id: profileId, ...data })
  }

  // Send WhatsApp notification if status changed
  if (data.status && data.status !== prevStatus) {
    const { data: profile } = await admin.from('profiles').select('phone, full_name').eq('id', profileId).single()
    if (profile?.phone) {
      const firstName = (profile.full_name || '').split(' ')[0] || 'vous'
      const msg = notifStatusChange(firstName, data.status)
      sendWhatsAppMessage(profile.phone, msg).catch(() => {})
    }
  }

  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function deleteProjectFile(fileId: string, storagePath: string | null) {
  const { admin } = await requireAdmin()

  if (storagePath) {
    await admin.storage.from('project-files').remove([storagePath])
  }
  await admin.from('project_files').delete().eq('id', fileId)

  revalidatePath('/project')
}

export async function getDownloadUrl(storagePath: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('project-files')
    .createSignedUrl(storagePath, 60 * 10) // 10 minutes

  if (error || !data?.signedUrl) throw new Error('Impossible de générer le lien')
  return data.signedUrl
}

export async function uploadProjectFile(formData: FormData) {
  const { admin } = await requireAdmin()

  const file = formData.get('file') as File
  const profileId = formData.get('profileId') as string
  const category = formData.get('category') as string
  const name = formData.get('name') as string
  const visibleToClient = formData.get('visibleToClient') !== 'false'

  if (!file || !profileId || !category || !name) throw new Error('Données manquantes')

  // Get or create project
  let projectId: string
  const { data: existing } = await admin.from('projects').select('id').eq('profile_id', profileId).single()
  if (existing) {
    projectId = existing.id
  } else {
    const { data: created } = await admin.from('projects').insert({ profile_id: profileId }).select('id').single()
    if (!created) throw new Error('Impossible de créer le projet')
    projectId = created.id
  }

  // Upload to Supabase Storage
  const bytes = await file.arrayBuffer()
  const path = `${profileId}/${category}/${Date.now()}-${file.name}`

  const { error: storageError } = await admin.storage
    .from('project-files')
    .upload(path, bytes, { contentType: file.type })

  if (storageError) throw new Error(storageError.message)

  // Save metadata to DB
  const { error: dbError } = await admin.from('project_files').insert({
    project_id: projectId,
    name,
    category,
    storage_path: path,
    original_name: file.name,
    size_bytes: file.size,
    visible_to_client: visibleToClient,
  })

  if (dbError) throw new Error(dbError.message)

  // Send WhatsApp notification for new file (only if visible to client)
  const { data: profile } = await admin.from('profiles').select('phone, full_name').eq('id', profileId).single()
  if (profile?.phone && visibleToClient) {
    const firstName = (profile.full_name || '').split(' ')[0] || 'vous'
    const msg = notifNewFile(firstName, name, category)
    sendWhatsAppMessage(profile.phone, msg).catch(() => {})
  }

  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function addProjectLink(profileId: string, data: {
  category: 'resource' | 'invoice' | 'quote'
  name: string
  url: string
  visibleToClient: boolean
}) {
  const { admin } = await requireAdmin()

  let projectId: string
  const { data: existing } = await admin.from('projects').select('id').eq('profile_id', profileId).single()
  if (existing) {
    projectId = existing.id
  } else {
    const { data: created } = await admin.from('projects').insert({ profile_id: profileId }).select('id').single()
    if (!created) throw new Error('Impossible de créer le projet')
    projectId = created.id
  }

  const { error } = await admin.from('project_files').insert({
    project_id: projectId,
    type: 'link',
    name: data.name,
    category: data.category,
    url: data.url,
    visible_to_client: data.visibleToClient,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function toggleFileVisibility(fileId: string, visible: boolean, profileId: string) {
  const { admin } = await requireAdmin()
  await admin.from('project_files').update({ visible_to_client: visible }).eq('id', fileId)
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function sendProjectNotification(profileId: string, message: string) {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('phone').eq('id', profileId).single()
  if (!profile?.phone) throw new Error('Aucun numéro de téléphone configuré pour cet utilisateur')
  await sendWhatsAppMessage(profile.phone, message)
}

export async function createStep(projectId: string, profileId: string, data: { title: string; description?: string }) {
  const { admin } = await requireAdmin()
  const { data: existing } = await admin.from('project_steps').select('position').eq('project_id', projectId).order('position', { ascending: false }).limit(1).single()
  const nextPos = (existing?.position ?? -1) + 1
  const { error } = await admin.from('project_steps').insert({
    project_id: projectId,
    title: data.title,
    description: data.description || null,
    status: 'todo',
    position: nextPos,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function updateStep(stepId: string, profileId: string, data: { title?: string; description?: string | null; status?: 'todo' | 'in_progress' | 'done' }) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('project_steps').update(data).eq('id', stepId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function deleteStep(stepId: string, profileId: string) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('project_steps').delete().eq('id', stepId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function reorderSteps(projectId: string, profileId: string, orderedIds: string[]) {
  const { admin } = await requireAdmin()
  await Promise.all(orderedIds.map((id, idx) =>
    admin.from('project_steps').update({ position: idx }).eq('id', id).eq('project_id', projectId)
  ))
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

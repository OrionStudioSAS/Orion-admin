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

function revalidateProjectPaths(projectId: string, profileId: string) {
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

// Create a new project for a profile
export async function createProject(profileId: string, name: string): Promise<string> {
  const { admin } = await requireAdmin()
  const { data, error } = await admin.from('projects').insert({
    profile_id: profileId,
    name: name.trim() || null,
    status: 'en_cours',
  }).select('id').single()
  if (error || !data) throw new Error(error?.message || 'Impossible de créer le projet')
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/users/${profileId}`)
  return data.id
}

// Update an existing project by ID
export async function updateProjectById(projectId: string, profileId: string, data: Partial<Project>) {
  const { admin } = await requireAdmin()

  const { data: existing } = await admin.from('projects').select('status').eq('id', projectId).single()
  const prevStatus = existing?.status ?? null

  await admin.from('projects').update({ ...data, updated_at: new Date().toISOString() }).eq('id', projectId)

  if (data.status && data.status !== prevStatus) {
    const { data: profile } = await admin.from('profiles').select('phone, full_name').eq('id', profileId).single()
    if (profile?.phone) {
      const firstName = (profile.full_name || '').split(' ')[0] || 'vous'
      const msg = notifStatusChange(firstName, data.status)
      sendWhatsAppMessage(profile.phone, msg).catch(() => {})
    }
  }

  revalidateProjectPaths(projectId, profileId)
}

// Legacy upsert (kept for compatibility)
export async function upsertProject(profileId: string, data: Partial<Project>) {
  const { admin } = await requireAdmin()

  const { data: existing } = await admin.from('projects').select('id, status').eq('profile_id', profileId).single()
  const prevStatus = existing?.status ?? null

  if (existing) {
    await admin.from('projects').update({ ...data, updated_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await admin.from('projects').insert({ profile_id: profileId, ...data })
  }

  if (data.status && data.status !== prevStatus) {
    const { data: profile } = await admin.from('profiles').select('phone, full_name').eq('id', profileId).single()
    if (profile?.phone) {
      const firstName = (profile.full_name || '').split(' ')[0] || 'vous'
      const msg = notifStatusChange(firstName, data.status)
      sendWhatsAppMessage(profile.phone, msg).catch(() => {})
    }
  }

  revalidatePath('/admin/projects')
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function deleteProjectFile(fileId: string, storagePath: string | null, projectId?: string, profileId?: string) {
  const { admin } = await requireAdmin()

  if (storagePath) {
    await admin.storage.from('project-files').remove([storagePath])
  }
  await admin.from('project_files').delete().eq('id', fileId)

  revalidatePath('/admin/projects')
  if (projectId) revalidatePath(`/admin/projects/${projectId}`)
  if (profileId) revalidatePath(`/admin/users/${profileId}`)
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
  const projectId = formData.get('projectId') as string
  const profileId = formData.get('profileId') as string
  const category = formData.get('category') as string
  const name = formData.get('name') as string
  const visibleToClient = formData.get('visibleToClient') !== 'false'

  if (!file || !projectId || !profileId || !category || !name) throw new Error('Données manquantes')

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

  revalidateProjectPaths(projectId, profileId)
}

export async function addProjectLink(projectId: string, profileId: string, data: {
  category: 'resource' | 'invoice' | 'quote'
  name: string
  url: string
  visibleToClient: boolean
}) {
  const { admin } = await requireAdmin()

  const { error } = await admin.from('project_files').insert({
    project_id: projectId,
    type: 'link',
    name: data.name,
    category: data.category,
    url: data.url,
    visible_to_client: data.visibleToClient,
  })
  if (error) throw new Error(error.message)

  revalidateProjectPaths(projectId, profileId)
}

export async function toggleFileVisibility(fileId: string, visible: boolean, profileId: string, projectId?: string) {
  const { admin } = await requireAdmin()
  await admin.from('project_files').update({ visible_to_client: visible }).eq('id', fileId)
  revalidatePath('/admin/projects')
  if (projectId) revalidatePath(`/admin/projects/${projectId}`)
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

export async function createStep(projectId: string, profileId: string, data: { title: string; description?: string; start_date?: string; end_date?: string }) {
  const { admin } = await requireAdmin()
  const { data: existing } = await admin.from('project_steps').select('position').eq('project_id', projectId).order('position', { ascending: false }).limit(1).single()
  const nextPos = (existing?.position ?? -1) + 1
  const { error } = await admin.from('project_steps').insert({
    project_id: projectId,
    title: data.title,
    description: data.description || null,
    status: 'todo',
    position: nextPos,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
  })
  if (error) throw new Error(error.message)
  revalidateProjectPaths(projectId, profileId)
}

export async function updateStep(stepId: string, profileId: string, data: { title?: string; description?: string | null; status?: 'todo' | 'in_progress' | 'done'; start_date?: string | null; end_date?: string | null }, projectId?: string) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('project_steps').update(data).eq('id', stepId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/projects')
  if (projectId) revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function deleteStep(stepId: string, profileId: string, projectId?: string) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('project_steps').delete().eq('id', stepId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/projects')
  if (projectId) revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function reorderSteps(projectId: string, profileId: string, orderedIds: string[]) {
  const { admin } = await requireAdmin()
  await Promise.all(orderedIds.map((id, idx) =>
    admin.from('project_steps').update({ position: idx }).eq('id', id).eq('project_id', projectId)
  ))
  revalidateProjectPaths(projectId, profileId)
}

export async function sendStepMessage(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const admin = createAdminClient()
  const { data: senderProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = senderProfile?.role === 'admin'

  const stepId = formData.get('stepId') as string
  const projectId = formData.get('projectId') as string
  const content = (formData.get('content') as string)?.trim() || null
  const file = formData.get('file') as File | null
  const profileId = formData.get('profileId') as string

  if (!isAdmin) {
    const { data: project } = await admin.from('projects').select('profile_id').eq('id', projectId).single()
    if (project?.profile_id !== user.id) throw new Error('Accès refusé')
  }

  if (!content && (!file || file.size === 0)) throw new Error('Message vide')

  let attachmentPath: string | null = null
  let attachmentName: string | null = null
  let attachmentSize: number | null = null
  let attachmentType: string | null = null

  if (file && file.size > 0) {
    const bytes = await file.arrayBuffer()
    attachmentPath = `step-chat/${profileId}/${stepId}/${Date.now()}-${file.name}`
    const { error: storageError } = await admin.storage
      .from('project-files')
      .upload(attachmentPath, bytes, { contentType: file.type })
    if (storageError) throw new Error(storageError.message)
    attachmentName = file.name
    attachmentSize = file.size
    attachmentType = file.type
  }

  await admin.from('step_messages').insert({
    step_id: stepId,
    project_id: projectId,
    sender_id: user.id,
    is_admin_sender: isAdmin,
    content,
    attachment_path: attachmentPath,
    attachment_name: attachmentName,
    attachment_size: attachmentSize,
    attachment_type: attachmentType,
    is_read: false,
  })

  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function markStepMessagesRead(stepId: string, projectId: string, isAdmin: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  // Mark messages sent by the OTHER party as read
  await admin.from('step_messages')
    .update({ is_read: true })
    .eq('step_id', stepId)
    .eq('project_id', projectId)
    .eq('is_admin_sender', !isAdmin)
    .eq('is_read', false)
}

export async function approveStep(stepId: string, projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  const admin = createAdminClient()
  // Verify the project belongs to this user
  const { data: project } = await admin.from('projects').select('profile_id').eq('id', projectId).single()
  if (project?.profile_id !== user.id) throw new Error('Accès refusé')
  await admin.from('project_steps').update({ client_approved: true }).eq('id', stepId)
  revalidatePath('/project')
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${projectId}`)
}

export async function addTeamMember(projectId: string, profileId: string, memberId: string, roleOverride?: string) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('project_team_members').upsert({
    project_id: projectId,
    profile_id: memberId,
    role_override: roleOverride || null,
  }, { onConflict: 'project_id,profile_id' })
  if (error) throw new Error(error.message)
  revalidateProjectPaths(projectId, profileId)
}

export async function removeTeamMember(projectId: string, profileId: string, memberId: string) {
  const { admin } = await requireAdmin()
  await admin.from('project_team_members').delete().eq('project_id', projectId).eq('profile_id', memberId)
  revalidateProjectPaths(projectId, profileId)
}

export async function addProjectApp(projectId: string, profileId: string, appId: string) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('project_apps').upsert({
    project_id: projectId,
    app_id: appId,
  }, { onConflict: 'project_id,app_id' })
  if (error) throw new Error(error.message)
  revalidateProjectPaths(projectId, profileId)
}

export async function removeProjectApp(projectId: string, profileId: string, appId: string) {
  const { admin } = await requireAdmin()
  await admin.from('project_apps').delete().eq('project_id', projectId).eq('app_id', appId)
  revalidateProjectPaths(projectId, profileId)
}

export async function createApp(name: string, description?: string): Promise<string> {
  const { admin } = await requireAdmin()
  const { data, error } = await admin.from('apps').insert({ name, description: description || null }).select('id').single()
  if (error || !data) throw new Error(error?.message || 'Erreur')
  revalidatePath('/admin/projects')
  return data.id
}

export async function deleteApp(appId: string) {
  const { admin } = await requireAdmin()
  // Also delete logo from storage if needed
  await admin.from('apps').delete().eq('id', appId)
  revalidatePath('/admin/projects')
}

export async function uploadAppLogo(formData: FormData): Promise<string> {
  const { admin } = await requireAdmin()
  const file = formData.get('file') as File
  const appId = formData.get('appId') as string
  if (!file || !appId) throw new Error('Données manquantes')
  const ext = file.name.split('.').pop() || 'png'
  const path = `app-logos/${appId}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error } = await admin.storage.from('project-files').upload(path, bytes, { contentType: file.type, upsert: true })
  if (error) throw new Error(error.message)
  const { data: urlData } = admin.storage.from('project-files').getPublicUrl(path)
  const url = `${urlData.publicUrl}?t=${Date.now()}`
  await admin.from('apps').update({ logo_url: url }).eq('id', appId)
  revalidatePath('/admin/projects')
  return url
}

export async function getStepAttachmentUrl(attachmentPath: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('project-files')
    .createSignedUrl(attachmentPath, 60 * 10)
  if (error || !data?.signedUrl) throw new Error('Impossible de générer le lien')
  return data.signedUrl
}

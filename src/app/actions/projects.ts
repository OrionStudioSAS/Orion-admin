'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Project } from '@/types/database'

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

  const { data: existing } = await admin.from('projects').select('id').eq('profile_id', profileId).single()

  if (existing) {
    await admin.from('projects').update({ ...data, updated_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await admin.from('projects').insert({ profile_id: profileId, ...data })
  }

  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

export async function deleteProjectFile(fileId: string, storagePath: string) {
  const { admin } = await requireAdmin()

  // Delete from storage
  await admin.storage.from('project-files').remove([storagePath])
  // Delete from DB
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
  })

  if (dbError) throw new Error(dbError.message)

  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/project')
}

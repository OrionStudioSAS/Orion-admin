'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listEditableFiles, getFileContent, updateFileContent } from '@/lib/github'
import * as cheerio from 'cheerio'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return { user, admin, isAdmin: profile?.role === 'admin' }
}

async function requireAdmin() {
  const auth = await requireAuth()
  if (!auth.isAdmin) throw new Error('Accès refusé')
  return auth
}

export interface ClientSite {
  id: string
  project_id: string
  github_repo: string
  github_branch: string
  site_url: string | null
  created_at: string
  project_name: string | null
  client_name: string | null
}

export interface CmsSection {
  name: string
  key: string
}

export interface CmsField {
  id: string
  label: string
  tag: string
  type: 'text' | 'image'
  value: string
  section: string
}

export interface CmsSectionData {
  fields: CmsField[]
}

// ─── Sites CRUD ───

export async function getSites(): Promise<ClientSite[]> {
  const { admin } = await requireAdmin()
  const { data } = await admin
    .from('client_sites')
    .select('*, projects(name, site_url, profiles(full_name))')
    .order('created_at', { ascending: false })

  if (!data) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((s: any) => ({
    id: s.id,
    project_id: s.project_id,
    github_repo: s.github_repo,
    github_branch: s.github_branch,
    site_url: s.projects?.site_url || null,
    created_at: s.created_at,
    project_name: s.projects?.name || null,
    client_name: s.projects?.profiles?.full_name || null,
  }))
}

export async function addSite(projectId: string, githubRepo: string, githubBranch: string = 'main') {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('client_sites').insert({
    project_id: projectId,
    github_repo: githubRepo,
    github_branch: githubBranch,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function removeSite(siteId: string) {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('client_sites').delete().eq('id', siteId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Sections & Fields (from source files, grouped by ID prefix) ───

async function getSiteById(siteId: string) {
  const { user, admin, isAdmin } = await requireAuth()
  const { data } = await admin.from('client_sites').select('*, projects(profile_id, site_url)').eq('id', siteId).single()
  if (!data) throw new Error('Site introuvable')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any
  if (!isAdmin && d.projects?.profile_id !== user.id) throw new Error('Accès refusé')
  return { ...data, site_url: d.projects?.site_url as string | null }
}

/** Get the site linked to the client's project */
export async function getClientSite(): Promise<ClientSite | null> {
  const { user, admin, isAdmin } = await requireAuth()
  if (isAdmin) return null

  const { data: project } = await admin
    .from('projects')
    .select('id')
    .eq('profile_id', user.id)
    .limit(1)
    .single()

  if (!project) return null

  const { data: site } = await admin
    .from('client_sites')
    .select('*, projects(name, site_url, profiles(full_name))')
    .eq('project_id', project.id)
    .limit(1)
    .single()

  if (!site) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = site as any
  return {
    id: s.id,
    project_id: s.project_id,
    github_repo: s.github_repo,
    github_branch: s.github_branch,
    site_url: s.projects?.site_url || null,
    created_at: s.created_at,
    project_name: s.projects?.name || null,
    client_name: s.projects?.profiles?.full_name || null,
  }
}

function idToLabel(id: string): string {
  // Remove cms- prefix AND section prefix: cms-hero_titre → Titre
  const withoutCms = id.replace(/^cms-/, '')
  const withoutSection = withoutCms.replace(/^[^_]+_/, '')
  return withoutSection
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function sectionFromId(id: string): string {
  // cms-hero_titre → hero, cms-apropos_nom → apropos
  const withoutCms = id.replace(/^cms-/, '')
  const section = withoutCms.split('_')[0]
  return section
}

function sectionToName(key: string): string {
  const map: Record<string, string> = {
    hero: 'Accueil',
    apropos: 'À propos',
    expertise: 'Expertise',
    diplomes: 'Diplômes',
    associations: 'Associations',
    impedance: 'Impédance',
    cabinets: 'Cabinets',
    avis: 'Avis clients',
    contact: 'Contact',
    faq: 'FAQ',
    footer: 'Pied de page',
    tarifs: 'Tarifs',
    services: 'Services',
    equipe: 'Équipe',
    blog: 'Blog',
    galerie: 'Galerie',
  }
  return map[key] || key.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Parse all cms- IDs from a source file (JSX/TSX/HTML) */
function parseFieldsFromSource(content: string, filePath: string): CmsField[] {
  const fields: CmsField[] = []
  const isHtml = filePath.endsWith('.html')

  if (isHtml) {
    const $ = cheerio.load(content)
    $('[id^="cms-"]').each((_, el) => {
      const $el = $(el)
      const id = $el.attr('id') || ''
      const tag = (el as { tagName?: string }).tagName?.toLowerCase() || 'div'
      const isImage = tag === 'img'
      fields.push({
        id,
        label: idToLabel(id),
        tag,
        type: isImage ? 'image' : 'text',
        value: isImage ? ($el.attr('src') || '') : $el.html() || '',
        section: sectionFromId(id),
      })
    })
  } else {
    // JSX/TSX: regex
    const regex = /<(\w+)\s[^>]*?id=["'](cms-[^"']+)["'][^>]*?(?:\/>|>([\s\S]*?)<\/\1>)/g
    let match
    while ((match = regex.exec(content)) !== null) {
      const tag = match[1].toLowerCase()
      const id = match[2]
      const inner = match[3] || ''
      const isImage = tag === 'img'

      if (isImage) {
        const srcMatch = match[0].match(/src=["']([^"']+)["']/)
        fields.push({ id, label: idToLabel(id), tag, type: 'image', value: srcMatch?.[1] || '', section: sectionFromId(id) })
      } else {
        const textValue = inner.replace(/<[^>]+>/g, '').trim()
        fields.push({ id, label: idToLabel(id), tag, type: 'text', value: textValue, section: sectionFromId(id) })
      }
    }
  }

  return fields
}

/** Scan all source files and return sections that have cms- fields */
export async function getCmsSections(siteId: string): Promise<CmsSection[]> {
  const site = await getSiteById(siteId)
  const repo = site.github_repo as string
  const branch = site.github_branch as string

  const files = await listEditableFiles(repo, branch)
  const sectionKeys = new Set<string>()

  for (const file of files) {
    const { content } = await getFileContent(repo, branch, file.path)
    if (!/id=["']cms-/.test(content)) continue
    const fields = parseFieldsFromSource(content, file.path)
    fields.forEach(f => sectionKeys.add(f.section))
  }

  // Return sections in a logical order
  const ordered = ['hero', 'apropos', 'expertise', 'diplomes', 'associations', 'impedance', 'cabinets', 'services', 'tarifs', 'avis', 'contact', 'faq', 'footer']
  const sorted = [...sectionKeys].sort((a, b) => {
    const ia = ordered.indexOf(a)
    const ib = ordered.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  return sorted.map(key => ({ name: sectionToName(key), key }))
}

/** Get all cms- fields for a given section, scanning source files */
export async function getCmsSectionFields(siteId: string, sectionKey: string): Promise<CmsSectionData> {
  const site = await getSiteById(siteId)
  const repo = site.github_repo as string
  const branch = site.github_branch as string

  const files = await listEditableFiles(repo, branch)
  const allFields: CmsField[] = []

  for (const file of files) {
    const { content } = await getFileContent(repo, branch, file.path)
    if (!/id=["']cms-/.test(content)) continue
    const fields = parseFieldsFromSource(content, file.path)
    allFields.push(...fields.filter(f => f.section === sectionKey))
  }

  return { fields: allFields }
}

/** Find the source file containing a cms- ID, update it, and push */
export async function updateCmsFields(
  siteId: string,
  _sectionKey: string,
  updates: { id: string; value: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
  const site = await getSiteById(siteId)
  const repo = site.github_repo as string
  const branch = site.github_branch as string

  const files = await listEditableFiles(repo, branch)

  // Load all files that contain cms- IDs once
  const fileCache = new Map<string, { content: string; sha: string }>()
  for (const file of files) {
    const data = await getFileContent(repo, branch, file.path)
    if (/id=["']cms-/.test(data.content)) {
      fileCache.set(file.path, { content: data.content, sha: data.sha })
    }
  }

  // Group updates by source file
  const fileUpdates = new Map<string, { id: string; value: string }[]>()

  for (const update of updates) {
    for (const [filePath, { content }] of fileCache) {
      if (new RegExp(`id=["']${update.id}["']`).test(content)) {
        if (!fileUpdates.has(filePath)) fileUpdates.set(filePath, [])
        fileUpdates.get(filePath)!.push(update)
        break
      }
    }
  }

  // Apply updates per file and push
  for (const [filePath, edits] of fileUpdates) {
    const cached = fileCache.get(filePath)!
    let content = cached.content
    const isHtml = filePath.endsWith('.html')

    if (isHtml) {
      const $ = cheerio.load(content)
      for (const { id, value } of edits) {
        const $el = $(`#${id}`)
        if (!$el.length) continue
        const tag = ($el[0] as { tagName?: string }).tagName?.toLowerCase()
        if (tag === 'img') {
          $el.attr('src', value)
        } else {
          $el.html(value)
        }
      }
      content = $.html()
    } else {
      for (const { id, value } of edits) {
        const imgRegex = new RegExp(`(<\\w+\\s[^>]*?id=["']${id}["'][^>]*?)src=["'][^"']*["']`)
        if (imgRegex.test(content)) {
          content = content.replace(imgRegex, `$1src="${value}"`)
          continue
        }
        const textRegex = new RegExp(`(<(\\w+)\\s[^>]*?id=["']${id}["'][^>]*?>)[\\s\\S]*?(<\\/\\2>)`)
        content = content.replace(textRegex, `$1${value}$3`)
      }
    }

    const fileName = filePath.split('/').pop() || filePath
    await updateFileContent(repo, branch, filePath, content, cached.sha, `cms: update content in ${fileName}`)
  }

  return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

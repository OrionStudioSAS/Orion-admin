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
  created_at: string
  project_name: string | null
  client_name: string | null
}

export interface CmsPage {
  name: string
  path: string
}

export interface CmsField {
  id: string
  label: string
  tag: string
  type: 'text' | 'image'
  value: string
}

export interface CmsPageData {
  fields: CmsField[]
  sha: string
}

// ─── Sites CRUD ───

export async function getSites(): Promise<ClientSite[]> {
  const { admin } = await requireAdmin()
  const { data } = await admin
    .from('client_sites')
    .select('*, projects(name, profiles(full_name))')
    .order('created_at', { ascending: false })

  if (!data) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((s: any) => ({
    id: s.id,
    project_id: s.project_id,
    github_repo: s.github_repo,
    github_branch: s.github_branch,
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

// ─── Pages & Fields ───

async function getSiteById(siteId: string) {
  const { user, admin, isAdmin } = await requireAuth()
  const { data } = await admin.from('client_sites').select('*, projects(profile_id)').eq('id', siteId).single()
  if (!data) throw new Error('Site introuvable')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!isAdmin && (data as any).projects?.profile_id !== user.id) throw new Error('Accès refusé')
  return data
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
    .select('*, projects(name, profiles(full_name))')
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
    created_at: s.created_at,
    project_name: s.projects?.name || null,
    client_name: s.projects?.profiles?.full_name || null,
  }
}

export async function getCmsPages(siteId: string): Promise<CmsPage[]> {
  const site = await getSiteById(siteId)
  const allFiles = await listEditableFiles(site.github_repo, site.github_branch)

  // Only return files that actually contain cms- IDs
  const pagesWithCms: CmsPage[] = []
  for (const file of allFiles) {
    const { content } = await getFileContent(site.github_repo, site.github_branch, file.path)
    if (/id=["']cms-/.test(content)) {
      pagesWithCms.push(file)
    }
  }
  return pagesWithCms
}

function idToLabel(id: string): string {
  return id
    .replace(/^cms-/, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function isJsx(path: string): boolean {
  return path.endsWith('.tsx') || path.endsWith('.jsx')
}

/** Parse cms- fields from JSX/TSX using regex */
function parseJsxFields(content: string): CmsField[] {
  const fields: CmsField[] = []
  // Match: <tag ...id="cms-xxx"...>content</tag> or self-closing <img ...id="cms-xxx".../>
  const regex = /<(\w+)\s[^>]*?id=["'](cms-[^"']+)["'][^>]*?(?:\/>|>([\s\S]*?)<\/\1>)/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const tag = match[1].toLowerCase()
    const id = match[2]
    const inner = match[3] || ''
    const isImage = tag === 'img'

    if (isImage) {
      const srcMatch = match[0].match(/src=["']([^"']+)["']/)
      fields.push({ id, label: idToLabel(id), tag, type: 'image', value: srcMatch?.[1] || '' })
    } else {
      // Clean JSX: extract text content, strip nested tags
      const textValue = inner.replace(/<[^>]+>/g, '').trim()
      fields.push({ id, label: idToLabel(id), tag, type: 'text', value: textValue })
    }
  }
  return fields
}

export async function getCmsFields(siteId: string, pagePath: string): Promise<CmsPageData> {
  const site = await getSiteById(siteId)
  const { content, sha } = await getFileContent(site.github_repo, site.github_branch, pagePath)

  let fields: CmsField[]

  if (isJsx(pagePath)) {
    fields = parseJsxFields(content)
  } else {
    // HTML parsing with cheerio
    const $ = cheerio.load(content)
    fields = []
    $('[id^="cms-"]').each((_, el) => {
      const $el = $(el)
      const id = $el.attr('id') || ''
      const tag = (el as { tagName?: string }).tagName?.toLowerCase() || 'div'
      const isImg = tag === 'img'
      fields.push({
        id,
        label: idToLabel(id),
        tag,
        type: isImg ? 'image' : 'text',
        value: isImg ? ($el.attr('src') || '') : $el.html() || '',
      })
    })
  }

  return { fields, sha }
}

export async function updateCmsFields(
  siteId: string,
  pagePath: string,
  updates: { id: string; value: string }[],
  sha: string
) {
  const site = await getSiteById(siteId)
  const { content } = await getFileContent(site.github_repo, site.github_branch, pagePath)

  let updatedContent: string

  if (isJsx(pagePath)) {
    updatedContent = content
    for (const { id, value } of updates) {
      // Update image src
      const imgRegex = new RegExp(`(<\\w+\\s[^>]*?id=["']${id}["'][^>]*?)src=["'][^"']*["']`, 'g')
      if (imgRegex.test(updatedContent)) {
        updatedContent = updatedContent.replace(imgRegex, `$1src="${value}"`)
        continue
      }
      // Update text content: match the element with this id and replace inner text
      const textRegex = new RegExp(`(<(\\w+)\\s[^>]*?id=["']${id}["'][^>]*?>)[\\s\\S]*?(<\\/\\2>)`, 'g')
      updatedContent = updatedContent.replace(textRegex, `$1${value}$3`)
    }
  } else {
    const $ = cheerio.load(content)
    for (const { id, value } of updates) {
      const $el = $(`#${id}`)
      if (!$el.length) continue
      const tag = ($el[0] as { tagName?: string }).tagName?.toLowerCase()
      if (tag === 'img') {
        $el.attr('src', value)
      } else {
        $el.html(value)
      }
    }
    updatedContent = $.html()
  }

  const pageName = pagePath.split('/').pop() || pagePath

  await updateFileContent(
    site.github_repo,
    site.github_branch,
    pagePath,
    updatedContent,
    sha,
    `cms: update content in ${pageName}`
  )

  return { success: true }
}

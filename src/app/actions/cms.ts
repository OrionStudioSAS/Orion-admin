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

// ─── Pages & Fields (scraping the live site) ───

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

/** Scrape a URL and return parsed cheerio */
async function scrapePage(url: string) {
  const res = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'OrionCMS/1.0' } })
  if (!res.ok) throw new Error(`Erreur ${res.status} en chargeant ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function idToLabel(id: string): string {
  return id
    .replace(/^cms-/, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function pathToName(path: string): string {
  if (path === '/') return 'Accueil'
  return path
    .replace(/^\//, '')
    .replace(/\//g, ' / ')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/** Discover pages on the live site that contain cms- fields */
export async function getCmsPages(siteId: string): Promise<CmsPage[]> {
  const site = await getSiteById(siteId)
  if (!site.site_url) throw new Error('URL du site non configurée')

  const baseUrl = site.site_url as string
  const $ = await scrapePage(baseUrl)

  // Collect internal links
  const paths = new Set<string>(['/'])
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href.startsWith('/') && !href.startsWith('//') && !href.includes('.') && href !== '#') {
      paths.add(href.replace(/\/$/, '') || '/')
    } else if (href.startsWith(baseUrl)) {
      const path = href.replace(baseUrl, '').replace(/\/$/, '') || '/'
      if (!path.includes('.')) paths.add(path)
    }
  })

  // Check each page for cms- fields
  const pages: CmsPage[] = []
  for (const path of paths) {
    try {
      const pageUrl = path === '/' ? baseUrl : `${baseUrl}${path}`
      const $page = await scrapePage(pageUrl)
      const hasCmsFields = $page('[id^="cms-"]').length > 0
      if (hasCmsFields) {
        pages.push({ name: pathToName(path), path })
      }
    } catch {
      // Skip pages that fail to load
    }
  }

  return pages
}

/** Scrape a page from the live site and extract cms- fields */
export async function getCmsFields(siteId: string, pagePath: string): Promise<CmsPageData> {
  const site = await getSiteById(siteId)
  if (!site.site_url) throw new Error('URL du site non configurée')

  const baseUrl = site.site_url as string
  const pageUrl = pagePath === '/' ? baseUrl : `${baseUrl}${pagePath}`
  const $ = await scrapePage(pageUrl)

  const fields: CmsField[] = []

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
      value: isImage ? ($el.attr('src') || '') : $el.text() || '',
    })
  })

  return { fields }
}

/** Find the source file in the repo that contains a given cms- ID, update it, and push */
export async function updateCmsFields(
  siteId: string,
  _pagePath: string,
  updates: { id: string; value: string }[]
) {
  const site = await getSiteById(siteId)
  const repo = site.github_repo as string
  const branch = site.github_branch as string

  // Get all editable source files
  const files = await listEditableFiles(repo, branch)

  // Group updates by source file
  const fileUpdates = new Map<string, { id: string; value: string; sha: string; content: string }[]>()

  for (const update of updates) {
    // Search for the file containing this ID
    for (const file of files) {
      const { content, sha } = await getFileContent(repo, branch, file.path)
      const idPattern = new RegExp(`id=["']${update.id}["']`)
      if (idPattern.test(content)) {
        if (!fileUpdates.has(file.path)) {
          fileUpdates.set(file.path, [])
        }
        fileUpdates.get(file.path)!.push({ ...update, sha, content })
        break
      }
    }
  }

  // Apply updates per file
  for (const [filePath, edits] of fileUpdates) {
    let content = edits[0].content
    const sha = edits[0].sha
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
      // JSX/TSX: regex replacement
      for (const { id, value } of edits) {
        // Image src update
        const imgRegex = new RegExp(`(<\\w+\\s[^>]*?id=["']${id}["'][^>]*?)src=["'][^"']*["']`)
        if (imgRegex.test(content)) {
          content = content.replace(imgRegex, `$1src="${value}"`)
          continue
        }
        // Text content update
        const textRegex = new RegExp(`(<(\\w+)\\s[^>]*?id=["']${id}["'][^>]*?>)[\\s\\S]*?(<\\/\\2>)`)
        content = content.replace(textRegex, `$1${value}$3`)
      }
    }

    const fileName = filePath.split('/').pop() || filePath
    await updateFileContent(repo, branch, filePath, content, sha, `cms: update content in ${fileName}`)
  }

  return { success: true }
}

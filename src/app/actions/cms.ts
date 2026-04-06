'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findConstantsFile, getFileContent, updateFileContent } from '@/lib/github'

// ─── Auth ───

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

// ─── Types ───

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

export interface CmsStringField {
  name: string
  label: string
  type: 'string'
  value: string
}

export interface CmsStringArrayField {
  name: string
  label: string
  type: 'string_array'
  items: string[]
}

export interface CmsObjectArrayField {
  name: string
  label: string
  type: 'object_array'
  keys: string[]
  keyLabels: string[]
  items: Record<string, string>[]
}

export type CmsField = CmsStringField | CmsStringArrayField | CmsObjectArrayField

export interface CmsSectionData {
  fields: CmsField[]
}

export interface CmsFieldUpdate {
  name: string
  type: 'string' | 'string_array' | 'object_array'
  value: string | string[] | Record<string, string>[]
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

// ─── Site access ───

async function getSiteById(siteId: string) {
  const { user, admin, isAdmin } = await requireAuth()
  const { data } = await admin.from('client_sites').select('*, projects(profile_id, site_url)').eq('id', siteId).single()
  if (!data) throw new Error('Site introuvable')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any
  if (!isAdmin && d.projects?.profile_id !== user.id) throw new Error('Accès refusé')
  return { ...data, site_url: d.projects?.site_url as string | null }
}

export async function getClientSite(): Promise<ClientSite | null> {
  const { user, admin, isAdmin } = await requireAuth()
  if (isAdmin) return null
  const { data: project } = await admin.from('projects').select('id').eq('profile_id', user.id).limit(1).single()
  if (!project) return null
  const { data: site } = await admin.from('client_sites').select('*, projects(name, site_url, profiles(full_name))').eq('project_id', project.id).limit(1).single()
  if (!site) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = site as any
  return {
    id: s.id, project_id: s.project_id, github_repo: s.github_repo, github_branch: s.github_branch,
    site_url: s.projects?.site_url || null, created_at: s.created_at,
    project_name: s.projects?.name || null, client_name: s.projects?.profiles?.full_name || null,
  }
}

// ─── Constants file parser ───

async function loadConstants(siteId: string) {
  const site = await getSiteById(siteId)
  const repo = site.github_repo as string
  const branch = site.github_branch as string
  const path = await findConstantsFile(repo, branch)
  if (!path) throw new Error('Fichier constants.ts introuvable dans le repo')
  const { content, sha } = await getFileContent(repo, branch, path)
  return { content, sha, path, repo, branch }
}

interface ParsedField {
  name: string
  type: 'string' | 'string_array' | 'object_array'
  value: string | string[] | Record<string, string>[]
  keys?: string[]
}

interface ParsedSection {
  name: string
  key: string
  fields: ParsedField[]
}

function parseConstantsFile(content: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  let current: ParsedSection | null = null

  // Split into lines for section detection, but use full content for value extraction
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Section header: // ─── Name ───
    const sectionMatch = line.match(/\/\/\s*[─—]+\s*(.+?)\s*[─—]+/)
    if (sectionMatch) {
      current = {
        name: sectionMatch[1].trim(),
        key: sectionMatch[1].trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        fields: [],
      }
      sections.push(current)
      continue
    }

    if (!current) continue

    // Skip non-export lines
    const exportMatch = line.match(/^export const (\w+)/)
    if (!exportMatch) continue
    const name = exportMatch[1]

    // Skip React.ReactNode, object literals (LOGO_COLORS)
    if (line.includes('React.ReactNode')) continue
    if (/=\s*\{/.test(line) && !line.includes('[')) continue

    // new URL("path", import.meta.url) or new URL("path", import.meta.url).href
    const urlMatch = line.match(/^export const \w+[^=]*=\s*new URL\(\s*["']([^"']+)["']\s*,/)
    if (urlMatch) {
      current.fields.push({ name, type: 'string', value: urlMatch[1] })
      continue
    }

    // Simple string: export const NAME = "value";
    const dqMatch = line.match(/^export const \w+[^=]*=\s*"((?:[^"\\]|\\.)*)"\s*;/)
    if (dqMatch) {
      current.fields.push({ name, type: 'string', value: dqMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') })
      continue
    }

    // Template literal string: export const NAME = `value`;
    if (/^export const \w+[^=]*=\s*`/.test(line)) {
      // Collect until closing backtick
      let val = ''
      const startLine = line.replace(/^export const \w+[^=]*=\s*`/, '')
      if (startLine.includes('`')) {
        val = startLine.replace(/`\s*;?\s*$/, '')
      } else {
        val = startLine + '\n'
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('`')) {
            val += lines[j].replace(/`\s*;?\s*$/, '')
            i = j
            break
          }
          val += lines[j] + '\n'
        }
      }
      current.fields.push({ name, type: 'string', value: val })
      continue
    }

    // Array: export const NAME... = [
    if (/=\s*\[\s*$/.test(line) || /=\s*\[/.test(line)) {
      // Collect the full array content
      let arrayText = ''
      let depth = 0
      for (let j = i; j < lines.length; j++) {
        const l = lines[j]
        arrayText += l + '\n'
        for (const ch of l) {
          if (ch === '[') depth++
          if (ch === ']') depth--
        }
        if (depth === 0) { i = j; break }
      }

      // Is it an object array or string array?
      if (arrayText.includes('{')) {
        // Object array - extract items
        const items: Record<string, string>[] = []
        const allKeys = new Set<string>()

        // Find each { ... } block
        const objRegex = /\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g
        let objMatch
        while ((objMatch = objRegex.exec(arrayText)) !== null) {
          const objText = objMatch[1]
          const item: Record<string, string> = {}

          // Extract double-quoted string fields: key: "value"
          const dqFieldRegex = /(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"/g
          let fieldMatch
          while ((fieldMatch = dqFieldRegex.exec(objText)) !== null) {
            const key = fieldMatch[1]
            // Skip keys that look like URLs to imported assets
            if (fieldMatch[2].startsWith('new URL')) continue
            item[key] = fieldMatch[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
            allKeys.add(key)
          }

          // Extract backtick string fields: key: `value`
          const btFieldRegex = /(\w+)\s*:\s*`([\s\S]*?)`/g
          let btMatch
          while ((btMatch = btFieldRegex.exec(objText)) !== null) {
            item[btMatch[1]] = btMatch[2]
            allKeys.add(btMatch[1])
          }

          // Extract new URL("path", ...) fields: key: new URL("path", import.meta.url).href
          const urlFieldRegex = /(\w+)\s*:\s*new URL\(\s*["']([^"']+)["']\s*,/g
          let urlFieldMatch
          while ((urlFieldMatch = urlFieldRegex.exec(objText)) !== null) {
            item[urlFieldMatch[1]] = urlFieldMatch[2]
            allKeys.add(urlFieldMatch[1])
          }

          if (Object.keys(item).length > 0) items.push(item)
        }

        if (items.length > 0) {
          current.fields.push({ name, type: 'object_array', value: items, keys: [...allKeys] })
        }
      } else {
        // String array - extract items
        const items: string[] = []
        const itemRegex = /"((?:[^"\\]|\\.)*)"/g
        let itemMatch
        while ((itemMatch = itemRegex.exec(arrayText)) !== null) {
          items.push(itemMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'))
        }
        if (items.length > 0) {
          current.fields.push({ name, type: 'string_array', value: items })
        }
      }
    }
  }

  return sections
}

// ─── Labels ───

function fieldLabel(constName: string, sectionKey: string): string {
  const labels: Record<string, string> = {
    SPECIALTIES: 'Spécialités', DIPLOMAS: 'Diplômes', ASSOCIATIONS: 'Associations',
    WORKPLACES: 'Cabinets', TESTIMONIALS: 'Témoignages', PRICES: 'Tarifs',
    FAQ_ITEMS: 'Questions fréquentes', SCHEDULE: 'Horaires', NAV_ITEMS: 'Liens de navigation',
    IMPEDANCE_BENEFITS: 'Bénéfices',
  }
  if (labels[constName]) return labels[constName]

  // Strip section prefix
  const prefix = sectionKey.toUpperCase().replace(/[^A-Z0-9]/g, '') + '_'
  let name = constName
  if (name.startsWith(prefix)) name = name.substring(prefix.length)

  return name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function keyLabel(key: string): string {
  const labels: Record<string, string> = {
    label: 'Intitulé', price: 'Prix', title: 'Titre', description: 'Description',
    question: 'Question', answer: 'Réponse', name: 'Nom', text: 'Texte',
    address: 'Adresse', day: 'Jour', hours: 'Horaires', location: 'Lieu',
    targetId: 'Ancre', mapUrl: 'Lien Google Maps', reviewUrl: 'Lien avis Google',
    imageUrl: 'Image', image: 'Image', icon: 'Icône',
  }
  return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

// ─── Public actions ───

export interface CmsAllData {
  sections: { section: CmsSection; fields: CmsField[] }[]
}

export async function getAllCmsData(siteId: string): Promise<CmsAllData> {
  const { content } = await loadConstants(siteId)
  const parsed = parseConstantsFile(content)

  const sections = parsed.filter(s => s.fields.length > 0).map(s => {
    const fields: CmsField[] = s.fields.map(f => {
      if (f.type === 'string') {
        return { name: f.name, label: fieldLabel(f.name, s.key), type: 'string' as const, value: f.value as string }
      }
      if (f.type === 'string_array') {
        return { name: f.name, label: fieldLabel(f.name, s.key), type: 'string_array' as const, items: f.value as string[] }
      }
      const keys = f.keys || []
      return {
        name: f.name,
        label: fieldLabel(f.name, s.key),
        type: 'object_array' as const,
        keys,
        keyLabels: keys.map(k => keyLabel(k)),
        items: f.value as Record<string, string>[],
      }
    })
    return { section: { name: s.name, key: s.key }, fields }
  })

  return { sections }
}

export async function getCmsSections(siteId: string): Promise<CmsSection[]> {
  const data = await getAllCmsData(siteId)
  return data.sections.map(s => s.section)
}

export async function getCmsSectionFields(siteId: string, sectionKey: string): Promise<CmsSectionData> {
  const data = await getAllCmsData(siteId)
  const section = data.sections.find(s => s.section.key === sectionKey)
  return { fields: section?.fields || [] }
}

// ─── Update ───

function escapeForDoubleQuote(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function applyStringUpdate(content: string, name: string, newValue: string): string {
  // new URL("path", import.meta.url) or new URL('path', ...).href
  const urlRegex = new RegExp(`(export const ${name}[^=]*=\\s*new URL\\(\\s*)["'][^"']+["']`)
  if (urlRegex.test(content)) {
    return content.replace(urlRegex, `$1'${newValue.replace(/'/g, "\\'")}'`)
  }
  // Double-quoted string
  const dqRegex = new RegExp(`(export const ${name}[^=]*=\\s*)"(?:[^"\\\\]|\\\\.)*"`)
  if (dqRegex.test(content)) {
    if (newValue.includes('\n')) {
      return content.replace(dqRegex, `$1\`${newValue}\``)
    }
    return content.replace(dqRegex, `$1"${escapeForDoubleQuote(newValue)}"`)
  }
  // Template literal
  const btRegex = new RegExp(`(export const ${name}[^=]*=\\s*)\`[\\s\\S]*?\``)
  if (btRegex.test(content)) {
    if (!newValue.includes('\n')) {
      return content.replace(btRegex, `$1"${escapeForDoubleQuote(newValue)}"`)
    }
    return content.replace(btRegex, `$1\`${newValue}\``)
  }
  return content
}

function applyStringArrayUpdate(content: string, name: string, items: string[]): string {
  // Find array boundaries
  const startRegex = new RegExp(`(export const ${name}[^=]*=\\s*)\\[`)
  const match = content.match(startRegex)
  if (!match || match.index === undefined) return content

  const arrayStart = match.index + match[0].length
  let depth = 1
  let arrayEnd = arrayStart
  while (depth > 0 && arrayEnd < content.length) {
    if (content[arrayEnd] === '[') depth++
    if (content[arrayEnd] === ']') depth--
    if (depth > 0) arrayEnd++
  }

  const newArrayContent = '\n' + items.map(item => `  "${escapeForDoubleQuote(item)}"`).join(',\n') + ',\n'
  return content.substring(0, arrayStart) + newArrayContent + content.substring(arrayEnd)
}

function applyObjectArrayUpdate(
  content: string,
  name: string,
  newItems: Record<string, string>[],
  originalItems: Record<string, string>[]
): string {
  // Find the array in source
  const startRegex = new RegExp(`export const ${name}[^=]*=\\s*\\[`)
  const match = content.match(startRegex)
  if (!match || match.index === undefined) return content

  let searchFrom = match.index + match[0].length

  // For each item pair, find the corresponding { ... } and update changed fields
  const minLen = Math.min(newItems.length, originalItems.length)
  for (let i = 0; i < minLen; i++) {
    const objStart = content.indexOf('{', searchFrom)
    if (objStart === -1) break

    // Find matching }
    let depth = 1
    let objEnd = objStart + 1
    while (depth > 0 && objEnd < content.length) {
      if (content[objEnd] === '{') depth++
      if (content[objEnd] === '}') depth--
      objEnd++
    }

    let objText = content.substring(objStart, objEnd)

    // Update changed fields within this object
    for (const key of Object.keys(newItems[i])) {
      if (newItems[i][key] === originalItems[i]?.[key]) continue
      const newVal = newItems[i][key]

      // Try double-quoted field
      const dqFieldRegex = new RegExp(`(${key}:\\s*)"(?:[^"\\\\]|\\\\.)*"`)
      if (dqFieldRegex.test(objText)) {
        if (newVal.includes('\n')) {
          objText = objText.replace(dqFieldRegex, `$1\`${newVal}\``)
        } else {
          objText = objText.replace(dqFieldRegex, `$1"${escapeForDoubleQuote(newVal)}"`)
        }
        continue
      }
      // Try backtick field
      const btFieldRegex = new RegExp(`(${key}:\\s*)\`[\\s\\S]*?\``)
      if (btFieldRegex.test(objText)) {
        if (newVal.includes('\n')) {
          objText = objText.replace(btFieldRegex, `$1\`${newVal}\``)
        } else {
          objText = objText.replace(btFieldRegex, `$1"${escapeForDoubleQuote(newVal)}"`)
        }
        continue
      }
      // Try new URL("path", ...) field
      const urlFieldRegex = new RegExp(`(${key}:\\s*new URL\\(\\s*)["'][^"']+["']`)
      if (urlFieldRegex.test(objText)) {
        objText = objText.replace(urlFieldRegex, `$1'${newVal.replace(/'/g, "\\'")}'`)
      }
    }

    content = content.substring(0, objStart) + objText + content.substring(objEnd)
    searchFrom = objStart + objText.length
  }

  return content
}

export async function updateCmsFields(
  siteId: string,
  sectionKey: string,
  updates: CmsFieldUpdate[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { content, sha, path, repo, branch } = await loadConstants(siteId)

    // Parse original values for comparison (object arrays need originals)
    const sections = parseConstantsFile(content)
    const section = sections.find(s => s.key === sectionKey)
    const origMap = new Map<string, ParsedField>()
    section?.fields.forEach(f => origMap.set(f.name, f))

    let updated = content

    for (const update of updates) {
      if (update.type === 'string') {
        updated = applyStringUpdate(updated, update.name, update.value as string)
      } else if (update.type === 'string_array') {
        updated = applyStringArrayUpdate(updated, update.name, update.value as string[])
      } else if (update.type === 'object_array') {
        const orig = origMap.get(update.name)
        const originalItems = (orig?.value || []) as Record<string, string>[]
        updated = applyObjectArrayUpdate(updated, update.name, update.value as Record<string, string>[], originalItems)
      }
    }

    await updateFileContent(repo, branch, path, updated, sha, `cms: update ${sectionKey}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

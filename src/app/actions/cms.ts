'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findConstantsFile, getFileContent, updateFileContent, getFileSha, uploadBinaryFile } from '@/lib/github'

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

export interface TranslationPair {
  baseField: CmsField
  translatedField: CmsField | null
}

export interface TranslationSectionData {
  section: CmsSection
  pairs: TranslationPair[]
}

export interface TranslationAllData {
  sections: TranslationSectionData[]
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

/** Check if a field name is a translation variant (e.g. HERO_TITLE_en) */
function getTranslationInfo(name: string): { baseName: string; lang: string } | null {
  const match = name.match(/_([a-z]{2})$/)
  if (!match) return null
  const lang = match[1]
  if (!LANG_CODES.has(lang)) return null
  return { baseName: name.slice(0, -(lang.length + 1)), lang }
}

/** Check if a field value is an image path (should not be translated) */
function isImageValue(value: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|avif|ico)(\?.*)?$/i.test(value)
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
  endLine: number  // line index where this field declaration ends
}

interface ParsedSection {
  name: string
  key: string
  fields: ParsedField[]
}

// Known 2-letter language codes for translation suffix detection
const LANG_CODES = new Set(['en', 'es', 'de', 'it', 'pt', 'nl', 'ar', 'zh', 'ja', 'ko', 'ru', 'pl', 'sv', 'da', 'fi', 'no', 'tr', 'ro', 'cs', 'hu', 'el', 'he', 'th', 'vi', 'uk', 'hr', 'bg', 'sk', 'sl', 'lt', 'lv', 'et', 'ca'])

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
      current.fields.push({ name, type: 'string', value: urlMatch[1], endLine: i })
      continue
    }

    // Simple string: export const NAME = "value";
    const dqMatch = line.match(/^export const \w+[^=]*=\s*"((?:[^"\\]|\\.)*)"\s*;/)
    if (dqMatch) {
      current.fields.push({ name, type: 'string', value: dqMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'), endLine: i })
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
      current.fields.push({ name, type: 'string', value: val, endLine: i })
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
          current.fields.push({ name, type: 'object_array', value: items, keys: [...allKeys], endLine: i })
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
          current.fields.push({ name, type: 'string_array', value: items, endLine: i })
        }
      }
    }
  }

  return sections
}

// ─── Labels ───

function fieldLabel(constName: string, sectionKey: string): string {
  // Strip section prefix (e.g. HERO_TITLE in section "hero" → TITLE)
  const prefix = sectionKey.toUpperCase().replace(/[^A-Z0-9]/g, '') + '_'
  let name = constName
  if (name.startsWith(prefix)) name = name.substring(prefix.length)

  // Convert SCREAMING_SNAKE to Title Case
  return name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

/** Common key translations for object fields (camelCase → French label) */
const KEY_LABELS: Record<string, string> = {
  label: 'Intitulé', price: 'Prix', title: 'Titre', description: 'Description',
  question: 'Question', answer: 'Réponse', name: 'Nom', text: 'Texte',
  address: 'Adresse', day: 'Jour', hours: 'Horaires', location: 'Lieu',
  targetId: 'Ancre', mapUrl: 'Lien Maps', reviewUrl: 'Lien avis',
  imageUrl: 'Image', image: 'Image', icon: 'Icône',
  url: 'URL', link: 'Lien', email: 'Email', phone: 'Téléphone',
  subtitle: 'Sous-titre', content: 'Contenu', category: 'Catégorie',
  date: 'Date', time: 'Heure', author: 'Auteur', role: 'Rôle',
  company: 'Entreprise', city: 'Ville', country: 'Pays',
}

function keyLabel(key: string): string {
  return KEY_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

// ─── Public actions ───

export interface CmsAllData {
  sections: { section: CmsSection; fields: CmsField[] }[]
}

export async function getAllCmsData(siteId: string): Promise<CmsAllData> {
  const { content } = await loadConstants(siteId)
  const parsed = parseConstantsFile(content)

  const sections = parsed.filter(s => s.fields.length > 0).map(s => {
    // Filter out translation fields (e.g. HERO_TITLE_en) from the main view
    const baseFields = s.fields.filter(f => !getTranslationInfo(f.name))
    const fields: CmsField[] = baseFields.map(f => {
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

// ─── Image upload ───

/**
 * Upload an image to the repo assets folder, returns the relative path (e.g. ./assets/filename.jpg).
 * The base64Data should NOT include the data:... prefix.
 */
export async function uploadCmsImage(
  siteId: string,
  fileName: string,
  base64Data: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    await requireAuth()
    const site = await getSiteById(siteId)
    const repo = site.github_repo as string
    const branch = site.github_branch as string

    // Find the constants file to determine the assets folder relative path
    const constPath = await findConstantsFile(repo, branch)
    if (!constPath) throw new Error('Fichier constants introuvable')

    // Assets folder is next to constants file
    const constDir = constPath.includes('/') ? constPath.substring(0, constPath.lastIndexOf('/')) : ''
    const assetsDir = constDir ? `${constDir}/assets` : 'assets'

    // Sanitize filename
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
    const filePath = `${assetsDir}/${safeName}`

    // Check if file already exists (need sha to overwrite)
    const existingSha = await getFileSha(repo, branch, filePath)

    // Upload
    await uploadBinaryFile(repo, branch, filePath, base64Data, `cms: upload ${safeName}`, existingSha)

    return { success: true, path: `./assets/${safeName}` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

/**
 * Get the raw GitHub URL for an asset in the repo (for preview).
 */
export async function getCmsImageUrl(
  siteId: string,
  relativePath: string
): Promise<string | null> {
  try {
    await requireAuth()
    const site = await getSiteById(siteId)
    const repo = site.github_repo as string
    const branch = site.github_branch as string

    const constPath = await findConstantsFile(repo, branch)
    if (!constPath) return null

    const constDir = constPath.includes('/') ? constPath.substring(0, constPath.lastIndexOf('/')) : ''
    // relativePath is like ./assets/logo.jpeg → strip ./
    const cleanRelative = relativePath.replace(/^\.\//, '')
    const fullPath = constDir ? `${constDir}/${cleanRelative}` : cleanRelative

    return `https://raw.githubusercontent.com/${repo}/${branch}/${fullPath}`
  } catch {
    return null
  }
}

/**
 * Resolve all image paths in a section to preview URLs (batch).
 */
export async function getCmsImageUrls(
  siteId: string,
  relativePaths: string[]
): Promise<Record<string, string>> {
  try {
    await requireAuth()
    const site = await getSiteById(siteId)
    const repo = site.github_repo as string
    const branch = site.github_branch as string

    const constPath = await findConstantsFile(repo, branch)
    if (!constPath) return {}

    const constDir = constPath.includes('/') ? constPath.substring(0, constPath.lastIndexOf('/')) : ''
    const result: Record<string, string> = {}

    for (const relPath of relativePaths) {
      const cleanRelative = relPath.replace(/^\.\//, '')
      const fullPath = constDir ? `${constDir}/${cleanRelative}` : cleanRelative
      // Add cache-buster to avoid stale images after upload
      result[relPath] = `https://raw.githubusercontent.com/${repo}/${branch}/${fullPath}?t=${Date.now()}`
    }
    return result
  } catch {
    return {}
  }
}

// ─── Translation ───

/** Get list of languages that already have translations in the constants file */
export async function getExistingTranslations(siteId: string): Promise<string[]> {
  const { content } = await loadConstants(siteId)
  const parsed = parseConstantsFile(content)
  const langs = new Set<string>()
  for (const section of parsed) {
    for (const field of section.fields) {
      const info = getTranslationInfo(field.name)
      if (info) langs.add(info.lang)
    }
  }
  return [...langs]
}

/** Get side-by-side translation data for a language */
export async function getTranslationData(siteId: string, lang: string): Promise<TranslationAllData> {
  const { content } = await loadConstants(siteId)
  const parsed = parseConstantsFile(content)

  const sections: TranslationSectionData[] = []

  for (const s of parsed) {
    const baseFields = s.fields.filter(f => !getTranslationInfo(f.name))
    // Skip fields that are images (not translatable)
    const translatableFields = baseFields.filter(f => {
      if (f.type === 'string' && isImageValue(f.value as string)) return false
      return true
    })

    if (translatableFields.length === 0) continue

    const pairs: TranslationPair[] = translatableFields.map(base => {
      const translatedName = `${base.name}_${lang}`
      const translatedField = s.fields.find(f => f.name === translatedName)

      const baseCms = toCmsField(base, s.key)

      if (translatedField) {
        return { baseField: baseCms, translatedField: toCmsField(translatedField, s.key) }
      }
      return { baseField: baseCms, translatedField: null }
    })

    sections.push({ section: { name: s.name, key: s.key }, pairs })
  }

  return { sections }
}

function toCmsField(f: ParsedField, sectionKey: string): CmsField {
  if (f.type === 'string') {
    return { name: f.name, label: fieldLabel(f.name, sectionKey), type: 'string', value: f.value as string }
  }
  if (f.type === 'string_array') {
    return { name: f.name, label: fieldLabel(f.name, sectionKey), type: 'string_array', items: f.value as string[] }
  }
  const keys = f.keys || []
  return {
    name: f.name, label: fieldLabel(f.name, sectionKey), type: 'object_array',
    keys, keyLabels: keys.map(k => keyLabel(k)), items: f.value as Record<string, string>[],
  }
}

/** Generate the source code for a translated constant */
function generateTranslatedConst(field: ParsedField, lang: string): string {
  const name = `${field.name}_${lang}`
  if (field.type === 'string') {
    const val = field.value as string
    if (val.includes('\n')) return `export const ${name} = \`${val}\`;`
    return `export const ${name} = "${escapeForDoubleQuote(val)}";`
  }
  if (field.type === 'string_array') {
    const items = field.value as string[]
    const lines = items.map(item => `  "${escapeForDoubleQuote(item)}"`).join(',\n')
    return `export const ${name}: string[] = [\n${lines},\n];`
  }
  // object_array
  const items = field.value as Record<string, string>[]
  const objLines = items.map(item => {
    const fields = Object.entries(item).map(([k, v]) => {
      if (v.includes('\n')) return `    ${k}: \`${v}\``
      return `    ${k}: "${escapeForDoubleQuote(v)}"`
    }).join(',\n')
    return `  {\n${fields},\n  }`
  }).join(',\n')
  return `export const ${name} = [\n${objLines},\n];`
}

/** Initialize translation for a language: duplicate all base fields with _lang suffix */
export async function initTranslation(
  siteId: string,
  lang: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { content, sha, path, repo, branch } = await loadConstants(siteId)
    const parsed = parseConstantsFile(content)
    const lines = content.split('\n')

    // Collect all insertions: { afterLine, code }
    const insertions: { afterLine: number; code: string }[] = []

    for (const section of parsed) {
      const baseFields = section.fields.filter(f => !getTranslationInfo(f.name))
      for (const field of baseFields) {
        // Skip images
        if (field.type === 'string' && isImageValue(field.value as string)) continue
        // Skip if translation already exists
        const translatedName = `${field.name}_${lang}`
        const alreadyExists = section.fields.some(f => f.name === translatedName)
        if (alreadyExists) continue

        const code = generateTranslatedConst(field, lang)
        insertions.push({ afterLine: field.endLine, code })
      }
    }

    if (insertions.length === 0) {
      return { success: true } // already fully translated
    }

    // Insert from bottom to top to preserve line numbers
    insertions.sort((a, b) => b.afterLine - a.afterLine)
    for (const ins of insertions) {
      lines.splice(ins.afterLine + 1, 0, ins.code)
    }

    const newContent = lines.join('\n')
    await updateFileContent(repo, branch, path, newContent, sha, `cms: init translation ${lang}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

/** Update translated fields (field names already include _lang suffix) */
export async function updateTranslationFields(
  siteId: string,
  lang: string,
  sectionKey: string,
  updates: CmsFieldUpdate[]
): Promise<{ success: boolean; error?: string }> {
  // Translation fields have names like HERO_TITLE_en — we can reuse updateCmsFields
  return updateCmsFields(siteId, sectionKey, updates)
}

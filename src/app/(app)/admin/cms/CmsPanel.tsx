'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PlusIcon, TrashIcon, EditIcon, CheckIcon, XIcon, DocumentIcon } from '@/components/ui/Icons'
import {
  ClientSite, CmsSection, CmsField, CmsStringField, CmsStringArrayField, CmsObjectArrayField, CmsFieldUpdate,
  addSite, removeSite, getCmsSections, getCmsSectionFields, updateCmsFields
} from '@/app/actions/cms'

interface ProjectInfo {
  id: string
  name: string
  clientName: string | null
}

interface Props {
  initialSites: ClientSite[]
  projects: ProjectInfo[]
}

// ─── Edited state shape ───

interface EditedState {
  strings: Record<string, string>           // name → value
  stringArrays: Record<string, string[]>    // name → items
  objectArrays: Record<string, Record<string, string>[]> // name → items
}

function buildInitialEdited(fields: CmsField[]): EditedState {
  const state: EditedState = { strings: {}, stringArrays: {}, objectArrays: {} }
  for (const f of fields) {
    if (f.type === 'string') state.strings[f.name] = f.value
    else if (f.type === 'string_array') state.stringArrays[f.name] = [...f.items]
    else if (f.type === 'object_array') state.objectArrays[f.name] = f.items.map(item => ({ ...item }))
  }
  return state
}

function hasAnyChanges(fields: CmsField[], edited: EditedState): boolean {
  for (const f of fields) {
    if (f.type === 'string' && edited.strings[f.name] !== f.value) return true
    if (f.type === 'string_array' && JSON.stringify(edited.stringArrays[f.name]) !== JSON.stringify(f.items)) return true
    if (f.type === 'object_array' && JSON.stringify(edited.objectArrays[f.name]) !== JSON.stringify(f.items)) return true
  }
  return false
}

function buildUpdates(fields: CmsField[], edited: EditedState): CmsFieldUpdate[] {
  const updates: CmsFieldUpdate[] = []
  for (const f of fields) {
    if (f.type === 'string' && edited.strings[f.name] !== f.value) {
      updates.push({ name: f.name, type: 'string', value: edited.strings[f.name] })
    }
    if (f.type === 'string_array' && JSON.stringify(edited.stringArrays[f.name]) !== JSON.stringify(f.items)) {
      updates.push({ name: f.name, type: 'string_array', value: edited.stringArrays[f.name] })
    }
    if (f.type === 'object_array' && JSON.stringify(edited.objectArrays[f.name]) !== JSON.stringify(f.items)) {
      updates.push({ name: f.name, type: 'object_array', value: edited.objectArrays[f.name] })
    }
  }
  return updates
}

// ─── Field renderers ───

function StringFieldEditor({ field, value, onChange }: { field: CmsStringField; value: string; onChange: (v: string) => void }) {
  const changed = value !== field.value
  const rows = value.length > 200 ? 5 : value.length > 100 ? 4 : value.length > 50 ? 3 : 2
  return (
    <div>
      <label className="text-xs font-medium text-white mb-1.5 block">{field.label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white text-sm rounded-xl px-3.5 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors resize-none"
        placeholder="Contenu..."
      />
      {changed && <div className="mt-1 text-[9px] text-amber-400/80">Modifié</div>}
    </div>
  )
}

function StringArrayFieldEditor({ field, items, onChange }: { field: CmsStringArrayField; items: string[]; onChange: (v: string[]) => void }) {
  const changed = JSON.stringify(items) !== JSON.stringify(field.items)
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-white">{field.label}</label>
        <span className="text-[9px] text-[#52525b]">{items.length} élément{items.length > 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={e => { const next = [...items]; next[i] = e.target.value; onChange(next) }}
              className="flex-1 bg-[#0a0a0a] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
            />
            <button
              type="button"
              onClick={() => { const next = items.filter((_, j) => j !== i); onChange(next) }}
              className="text-[#52525b] hover:text-red-400 transition-colors cursor-pointer p-1"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="flex items-center gap-1.5 text-[10px] text-[#a1a1aa] hover:text-white mt-2 px-2 py-1 rounded-lg border border-dashed border-[#1e1e1e] hover:border-white/20 transition-all cursor-pointer"
      >
        <PlusIcon className="w-3 h-3" />
        Ajouter
      </button>
      {changed && <div className="mt-1 text-[9px] text-amber-400/80">Modifié</div>}
    </div>
  )
}

function ObjectArrayFieldEditor({ field, items, onChange }: { field: CmsObjectArrayField; items: Record<string, string>[]; onChange: (v: Record<string, string>[]) => void }) {
  const changed = JSON.stringify(items) !== JSON.stringify(field.items)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-white">{field.label}</label>
        <span className="text-[9px] text-[#52525b]">{items.length} élément{items.length > 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const isExpanded = expandedIdx === i
          const preview = item[field.keys[0]] || `Élément ${i + 1}`
          return (
            <div key={i} className="border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-3.5 py-2.5 bg-[#0a0a0a] cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
              >
                <span className="text-xs text-white truncate">{preview}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); const next = items.filter((_, j) => j !== i); onChange(next); if (expandedIdx === i) setExpandedIdx(null) }}
                    className="text-[#52525b] hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                  <svg className={`w-3 h-3 text-[#52525b] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {isExpanded && (
                <div className="px-3.5 py-3 space-y-2 border-t border-[#1e1e1e]">
                  {field.keys.map((key, ki) => (
                    <div key={key}>
                      <label className="text-[10px] text-[#a1a1aa] mb-1 block">{field.keyLabels[ki]}</label>
                      {(item[key] || '').length > 80 ? (
                        <textarea
                          value={item[key] || ''}
                          onChange={e => { const next = items.map((it, j) => j === i ? { ...it, [key]: e.target.value } : it); onChange(next) }}
                          rows={3}
                          className="w-full bg-[#0f0f0f] border border-[#1e1e1e] text-white text-xs rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors resize-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={item[key] || ''}
                          onChange={e => { const next = items.map((it, j) => j === i ? { ...it, [key]: e.target.value } : it); onChange(next) }}
                          className="w-full bg-[#0f0f0f] border border-[#1e1e1e] text-white text-xs rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          const newItem: Record<string, string> = {}
          field.keys.forEach(k => { newItem[k] = '' })
          onChange([...items, newItem])
          setExpandedIdx(items.length)
        }}
        className="flex items-center gap-1.5 text-[10px] text-[#a1a1aa] hover:text-white mt-2 px-2 py-1 rounded-lg border border-dashed border-[#1e1e1e] hover:border-white/20 transition-all cursor-pointer"
      >
        <PlusIcon className="w-3 h-3" />
        Ajouter
      </button>
      {changed && <div className="mt-1 text-[9px] text-amber-400/80">Modifié</div>}
    </div>
  )
}

// ─── Main panel ───

export default function CmsPanel({ initialSites, projects }: Props) {
  const [sites, setSites] = useState(initialSites)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(initialSites[0]?.id || null)
  const [sections, setSections] = useState<CmsSection[]>([])
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [fields, setFields] = useState<CmsField[]>([])
  const [edited, setEdited] = useState<EditedState>({ strings: {}, stringArrays: {}, objectArrays: {} })
  const [loadingSections, setLoadingSections] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAddSite, setShowAddSite] = useState(false)
  const [newRepo, setNewRepo] = useState('')
  const [newBranch, setNewBranch] = useState('main')
  const [newProjectId, setNewProjectId] = useState('')
  const [addingError, setAddingError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const repoRef = useRef<HTMLInputElement>(null)

  const selectedSite = sites.find(s => s.id === selectedSiteId)
  const hasChanges = hasAnyChanges(fields, edited)

  // Load sections when site changes
  useEffect(() => {
    if (!selectedSiteId) { setSections([]); setSelectedSection(null); return }
    setLoadingSections(true)
    setSections([])
    setSelectedSection(null)
    setFields([])
    getCmsSections(selectedSiteId).then(s => {
      setSections(s)
      setLoadingSections(false)
    }).catch(() => setLoadingSections(false))
  }, [selectedSiteId])

  // Load fields when section changes
  useEffect(() => {
    if (!selectedSiteId || !selectedSection) { setFields([]); return }
    setLoadingFields(true)
    setFields([])
    setEdited({ strings: {}, stringArrays: {}, objectArrays: {} })
    getCmsSectionFields(selectedSiteId, selectedSection).then(data => {
      setFields(data.fields)
      setEdited(buildInitialEdited(data.fields))
      setLoadingFields(false)
    }).catch(() => setLoadingFields(false))
  }, [selectedSiteId, selectedSection])

  useEffect(() => {
    if (showAddSite) repoRef.current?.focus()
  }, [showAddSite])

  const updateString = useCallback((name: string, value: string) => {
    setEdited(prev => ({ ...prev, strings: { ...prev.strings, [name]: value } }))
  }, [])

  const updateStringArray = useCallback((name: string, value: string[]) => {
    setEdited(prev => ({ ...prev, stringArrays: { ...prev.stringArrays, [name]: value } }))
  }, [])

  const updateObjectArray = useCallback((name: string, value: Record<string, string>[]) => {
    setEdited(prev => ({ ...prev, objectArrays: { ...prev.objectArrays, [name]: value } }))
  }, [])

  async function handleAddSite() {
    if (!newProjectId || !newRepo.trim()) return
    setAddingError('')
    const result = await addSite(newProjectId, newRepo.trim(), newBranch.trim() || 'main')
    if (!result.success) { setAddingError(result.error || 'Erreur'); return }
    const { getSites } = await import('@/app/actions/cms')
    const freshSites = await getSites()
    setSites(freshSites)
    setShowAddSite(false)
    setNewRepo('')
    setNewBranch('main')
    setNewProjectId('')
    if (freshSites.length > 0) setSelectedSiteId(freshSites[0].id)
  }

  async function handleRemoveSite(siteId: string) {
    await removeSite(siteId)
    setSites(prev => prev.filter(s => s.id !== siteId))
    if (selectedSiteId === siteId) {
      const remaining = sites.filter(s => s.id !== siteId)
      setSelectedSiteId(remaining[0]?.id || null)
    }
  }

  async function handleSave() {
    if (!selectedSiteId || !selectedSection || !hasChanges) return
    setSaving(true)
    setSaveSuccess(false)
    const updates = buildUpdates(fields, edited)
    const result = await updateCmsFields(selectedSiteId, selectedSection, updates)
    setSaving(false)
    if (!result.success) {
      setSaveError(result.error || 'Erreur lors de la publication')
      setTimeout(() => setSaveError(''), 5000)
      return
    }
    setSaveSuccess(true)
    // Refresh fields from edited state
    setFields(prev => prev.map(f => {
      if (f.type === 'string' && edited.strings[f.name] !== undefined) return { ...f, value: edited.strings[f.name] }
      if (f.type === 'string_array' && edited.stringArrays[f.name]) return { ...f, items: edited.stringArrays[f.name] }
      if (f.type === 'object_array' && edited.objectArrays[f.name]) return { ...f, items: edited.objectArrays[f.name] }
      return f
    }))
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  function handleReset() {
    setEdited(buildInitialEdited(fields))
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left: Sites + Sections navigation */}
      <div className="w-64 shrink-0 border-r border-[#1e1e1e] flex flex-col min-h-0">
        {/* Site selector */}
        <div className="px-4 py-3.5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest">Site</span>
            <button
              type="button"
              onClick={() => setShowAddSite(v => !v)}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all cursor-pointer
                ${showAddSite
                  ? 'bg-white text-black border-white'
                  : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
            >
              <PlusIcon className="w-3 h-3" />
            </button>
          </div>
          {sites.length > 0 ? (
            <div className="space-y-1">
              {sites.map(site => (
                <div
                  key={site.id}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all group
                    ${selectedSiteId === site.id ? 'bg-white/5 border border-white/10' : 'hover:bg-white/[0.03] border border-transparent'}`}
                  onClick={() => setSelectedSiteId(site.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {site.project_name || site.github_repo}
                    </div>
                    <div className="text-[10px] text-[#52525b] truncate">{site.site_url || site.github_repo}</div>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleRemoveSite(site.id) }}
                    className="opacity-0 group-hover:opacity-100 text-[#52525b] hover:text-red-400 transition-all cursor-pointer"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : !showAddSite ? (
            <p className="text-[10px] text-[#52525b] mt-1">Aucun site configuré.</p>
          ) : null}
        </div>

        {/* Add site form */}
        {showAddSite && (
          <div className="px-4 py-3 border-b border-[#1e1e1e] bg-[#080808] space-y-2">
            <select
              value={newProjectId}
              onChange={e => setNewProjectId(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-[#1e1e1e] text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-white/30 transition-colors"
            >
              <option value="">Projet...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.clientName ? ` — ${p.clientName}` : ''}
                </option>
              ))}
            </select>
            <input
              ref={repoRef}
              type="text"
              value={newRepo}
              onChange={e => setNewRepo(e.target.value)}
              placeholder="owner/repo"
              className="w-full bg-[#0f0f0f] border border-[#1e1e1e] text-white text-xs rounded-lg px-2.5 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
            />
            <input
              type="text"
              value={newBranch}
              onChange={e => setNewBranch(e.target.value)}
              placeholder="Branche (main)"
              className="w-full bg-[#0f0f0f] border border-[#1e1e1e] text-white text-xs rounded-lg px-2.5 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
            />
            {addingError && <p className="text-[10px] text-red-400">{addingError}</p>}
            <button
              type="button"
              onClick={handleAddSite}
              disabled={!newProjectId || !newRepo.trim()}
              className="w-full text-[11px] font-medium bg-white text-black py-2 rounded-lg hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Ajouter le site
            </button>
          </div>
        )}

        {/* Sections list */}
        <div className="flex-1 overflow-y-auto">
          {selectedSiteId && (
            <div className="px-3 pt-3 pb-1">
              <span className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest px-1">Sections</span>
            </div>
          )}
          {loadingSections ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : (
            sections.map(section => {
              const isActive = selectedSection === section.key
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setSelectedSection(section.key)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors cursor-pointer
                    ${isActive ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
                >
                  <DocumentIcon className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
                  <span className={`text-xs truncate ${isActive ? 'text-white font-medium' : 'text-[#a1a1aa]'}`}>
                    {section.name}
                  </span>
                </button>
              )
            })
          )}
          {!loadingSections && selectedSiteId && sections.length === 0 && (
            <p className="text-[10px] text-[#52525b] text-center py-6">Aucune section trouvée</p>
          )}
        </div>
      </div>

      {/* Right: Fields editor */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!selectedSiteId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <EditIcon className="w-5 h-5 text-[#a1a1aa]" />
            </div>
            <p className="text-[#a1a1aa] text-sm">Ajoutez un site pour commencer</p>
            <p className="text-[#52525b] text-xs mt-1">Cliquez sur + pour lier un repo GitHub</p>
          </div>
        ) : !selectedSection ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <DocumentIcon className="w-5 h-5 text-[#a1a1aa]" />
            </div>
            <p className="text-[#a1a1aa] text-sm">Sélectionnez une section</p>
            <p className="text-[#52525b] text-xs mt-1">Choisissez une section à éditer</p>
          </div>
        ) : (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e1e] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <DocumentIcon className="w-4 h-4 text-[#a1a1aa] shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {sections.find(s => s.key === selectedSection)?.name || selectedSection}
                  </div>
                  <div className="text-[10px] text-[#52525b]">{selectedSite?.project_name || selectedSite?.github_repo}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {saveError && (
                  <span className="text-[10px] text-red-400 max-w-[200px] truncate">{saveError}</span>
                )}
                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa] hover:text-white px-3 py-1.5 rounded-lg border border-[#1e1e1e] hover:border-white/20 transition-all cursor-pointer"
                  >
                    <XIcon className="w-3 h-3" />
                    Annuler
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer
                    ${saveSuccess
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                >
                  {saving ? (
                    <div className="w-3 h-3 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="w-3 h-3" />
                  )}
                  {saving ? 'Envoi...' : saveSuccess ? 'Publié !' : 'Publier'}
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loadingFields ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              ) : fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-[#a1a1aa] text-sm">Aucun champ modifiable</p>
                </div>
              ) : (
                fields.map(field => {
                  if (field.type === 'string') {
                    return (
                      <StringFieldEditor
                        key={field.name}
                        field={field}
                        value={edited.strings[field.name] ?? field.value}
                        onChange={v => updateString(field.name, v)}
                      />
                    )
                  }
                  if (field.type === 'string_array') {
                    return (
                      <StringArrayFieldEditor
                        key={field.name}
                        field={field}
                        items={edited.stringArrays[field.name] ?? field.items}
                        onChange={v => updateStringArray(field.name, v)}
                      />
                    )
                  }
                  if (field.type === 'object_array') {
                    return (
                      <ObjectArrayFieldEditor
                        key={field.name}
                        field={field}
                        items={edited.objectArrays[field.name] ?? field.items}
                        onChange={v => updateObjectArray(field.name, v)}
                      />
                    )
                  }
                  return null
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

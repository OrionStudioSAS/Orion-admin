'use client'

import { useState, useEffect, useRef } from 'react'
import { PlusIcon, TrashIcon, EditIcon, CheckIcon, XIcon, DocumentIcon, ExternalLinkIcon } from '@/components/ui/Icons'
import { ClientSite, CmsPage, CmsField, addSite, removeSite, getCmsPages, getCmsFields, updateCmsFields } from '@/app/actions/cms'

interface ProjectInfo {
  id: string
  name: string
  clientName: string | null
}

interface Props {
  initialSites: ClientSite[]
  projects: ProjectInfo[]
}

export default function CmsPanel({ initialSites, projects }: Props) {
  const [sites, setSites] = useState(initialSites)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(initialSites[0]?.id || null)
  const [pages, setPages] = useState<CmsPage[]>([])
  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const [fields, setFields] = useState<CmsField[]>([])
  const [sha, setSha] = useState('')
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [loadingPages, setLoadingPages] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAddSite, setShowAddSite] = useState(false)
  const [newRepo, setNewRepo] = useState('')
  const [newBranch, setNewBranch] = useState('main')
  const [newProjectId, setNewProjectId] = useState('')
  const [addingError, setAddingError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const repoRef = useRef<HTMLInputElement>(null)

  const selectedSite = sites.find(s => s.id === selectedSiteId)

  // Load pages when site changes
  useEffect(() => {
    if (!selectedSiteId) { setPages([]); setSelectedPage(null); return }
    setLoadingPages(true)
    setPages([])
    setSelectedPage(null)
    setFields([])
    getCmsPages(selectedSiteId).then(p => {
      setPages(p)
      setLoadingPages(false)
    }).catch(() => setLoadingPages(false))
  }, [selectedSiteId])

  // Load fields when page changes
  useEffect(() => {
    if (!selectedSiteId || !selectedPage) { setFields([]); return }
    setLoadingFields(true)
    setFields([])
    setEditedValues({})
    getCmsFields(selectedSiteId, selectedPage).then(data => {
      setFields(data.fields)
      setSha(data.sha)
      const initial: Record<string, string> = {}
      data.fields.forEach(f => { initial[f.id] = f.value })
      setEditedValues(initial)
      setLoadingFields(false)
    }).catch(() => setLoadingFields(false))
  }, [selectedSiteId, selectedPage])

  // Focus repo input when adding site
  useEffect(() => {
    if (showAddSite) repoRef.current?.focus()
  }, [showAddSite])

  const hasChanges = fields.some(f => editedValues[f.id] !== f.value)

  async function handleAddSite() {
    if (!newProjectId || !newRepo.trim()) return
    setAddingError('')
    const result = await addSite(newProjectId, newRepo.trim(), newBranch.trim() || 'main')
    if (!result.success) { setAddingError(result.error || 'Erreur'); return }
    // Refresh sites
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
    if (!selectedSiteId || !selectedPage || !hasChanges) return
    setSaving(true)
    setSaveSuccess(false)
    const updates = fields
      .filter(f => editedValues[f.id] !== f.value)
      .map(f => ({ id: f.id, value: editedValues[f.id] }))

    await updateCmsFields(selectedSiteId, selectedPage, updates, sha)

    // Refresh fields to get new sha
    const data = await getCmsFields(selectedSiteId, selectedPage)
    setFields(data.fields)
    setSha(data.sha)
    const initial: Record<string, string> = {}
    data.fields.forEach(f => { initial[f.id] = f.value })
    setEditedValues(initial)
    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  function handleReset() {
    const initial: Record<string, string> = {}
    fields.forEach(f => { initial[f.id] = f.value })
    setEditedValues(initial)
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left: Sites + Pages navigation */}
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
                    <div className="text-[10px] text-[#52525b] truncate">{site.github_repo}</div>
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

        {/* Pages list */}
        <div className="flex-1 overflow-y-auto">
          {selectedSiteId && (
            <div className="px-3 pt-3 pb-1">
              <span className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest px-1">Pages</span>
            </div>
          )}
          {loadingPages ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : (
            pages.map(page => {
              const isActive = selectedPage === page.path
              return (
                <button
                  key={page.path}
                  type="button"
                  onClick={() => setSelectedPage(page.path)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors cursor-pointer
                    ${isActive ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
                >
                  <DocumentIcon className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
                  <span className={`text-xs truncate ${isActive ? 'text-white font-medium' : 'text-[#a1a1aa]'}`}>
                    {page.path}
                  </span>
                </button>
              )
            })
          )}
          {!loadingPages && selectedSiteId && pages.length === 0 && (
            <p className="text-[10px] text-[#52525b] text-center py-6">Aucun fichier .html trouvé</p>
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
        ) : !selectedPage ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <DocumentIcon className="w-5 h-5 text-[#a1a1aa]" />
            </div>
            <p className="text-[#a1a1aa] text-sm">Sélectionnez une page</p>
            <p className="text-[#52525b] text-xs mt-1">Choisissez un fichier HTML à éditer</p>
          </div>
        ) : (
          <>
            {/* Page header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e1e] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <DocumentIcon className="w-4 h-4 text-[#a1a1aa] shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{selectedPage}</div>
                  <div className="text-[10px] text-[#52525b]">{selectedSite?.github_repo} · {selectedSite?.github_branch}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
                  ) : saveSuccess ? (
                    <CheckIcon className="w-3 h-3" />
                  ) : (
                    <CheckIcon className="w-3 h-3" />
                  )}
                  {saving ? 'Envoi...' : saveSuccess ? 'Publié !' : 'Publier'}
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingFields ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              ) : fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-[#a1a1aa] text-sm">Aucun champ modifiable</p>
                  <p className="text-[#52525b] text-xs mt-1">
                    Ajoutez des attributs <code className="text-white/60 bg-white/5 px-1.5 py-0.5 rounded">id=&quot;cms-...&quot;</code> dans le HTML
                  </p>
                </div>
              ) : (
                fields.map(field => (
                  <div key={field.id} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-white">{field.label}</label>
                      <span className="text-[9px] text-[#52525b] font-mono">&lt;{field.tag}&gt; #{field.id}</span>
                    </div>
                    {field.type === 'image' ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editedValues[field.id] || ''}
                          onChange={e => setEditedValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white text-sm rounded-xl px-3.5 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors font-mono"
                          placeholder="URL de l'image..."
                        />
                        {editedValues[field.id] && (
                          <div className="flex items-center gap-2 text-[10px] text-[#a1a1aa]">
                            <ExternalLinkIcon className="w-3 h-3" />
                            <span className="truncate">{editedValues[field.id]}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={editedValues[field.id] || ''}
                        onChange={e => setEditedValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        rows={field.value.length > 100 ? 4 : field.value.length > 50 ? 3 : 2}
                        className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white text-sm rounded-xl px-3.5 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors resize-none"
                        placeholder="Contenu..."
                      />
                    )}
                    {editedValues[field.id] !== field.value && (
                      <div className="mt-1 text-[9px] text-amber-400/80">Modifié</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

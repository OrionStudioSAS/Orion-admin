'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DocumentIcon, CheckIcon, XIcon, PlusIcon, TrashIcon, UploadIcon } from '@/components/ui/Icons'
import {
  ClientSite, CmsField, CmsStringField, CmsStringArrayField, CmsObjectArrayField,
  CmsFieldUpdate, CmsAllData,
  getAllCmsData, updateCmsFields, uploadCmsImage, getCmsImageUrls
} from '@/app/actions/cms'

interface Props {
  site: ClientSite
}

// ─── Edited state ───

interface EditedState {
  strings: Record<string, string>
  stringArrays: Record<string, string[]>
  objectArrays: Record<string, Record<string, string>[]>
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

function isImageValue(value: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|avif|ico)(\?.*)?$/i.test(value) || /^(https?:\/\/).+\.(jpg|jpeg|png|gif|webp|svg|avif)/i.test(value)
}

// ─── Field renderers ───

function ImageFieldEditor({ field, value, onChange, previewUrl, siteId, onUploaded }: {
  field: CmsStringField; value: string; onChange: (v: string) => void
  previewUrl?: string; siteId: string; onUploaded: (newPath: string, localPreview: string) => void
}) {
  const changed = value !== field.value
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      const preview = URL.createObjectURL(file)
      setLocalPreview(preview)
      const result = await uploadCmsImage(siteId, file.name, base64)
      if (result.success && result.path) {
        onChange(result.path)
        onUploaded(result.path, preview)
      }
    } catch {
      // noop
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const displayUrl = localPreview || previewUrl
  return (
    <div>
      <label className="text-xs font-medium text-white mb-1.5 block">{field.label}</label>
      <div className="flex gap-3 items-start">
        <div
          className="w-24 h-24 rounded-xl border border-[#1e1e1e] overflow-hidden bg-[#0a0a0a] shrink-0 flex items-center justify-center cursor-pointer hover:border-white/20 transition-colors relative group"
          onClick={() => fileRef.current?.click()}
        >
          {displayUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <UploadIcon className="w-5 h-5 text-white" />
              </div>
            </>
          ) : (
            <div className="text-center">
              <UploadIcon className="w-5 h-5 text-[#52525b] mx-auto mb-1" />
              <span className="text-[9px] text-[#52525b]">Image</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="text-[10px] text-[#52525b] font-mono truncate">{value}</div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa] hover:text-white px-3 py-1.5 rounded-lg border border-[#1e1e1e] hover:border-white/20 transition-all cursor-pointer disabled:opacity-30"
          >
            <UploadIcon className="w-3.5 h-3.5" />
            {uploading ? 'Envoi...' : 'Remplacer l\'image'}
          </button>
          {changed && <div className="text-[9px] text-amber-400/80">Modifié</div>}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}

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
              onClick={() => onChange(items.filter((_, j) => j !== i))}
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
                    onClick={e => { e.stopPropagation(); onChange(items.filter((_, j) => j !== i)); if (expandedIdx === i) setExpandedIdx(null) }}
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

// ─── Refresh icon ───

function RefreshIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

// ─── Main panel ───

export default function ClientCmsPanel({ site }: Props) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [allData, setAllData] = useState<CmsAllData | null>(null)
  const [editedPerSection, setEditedPerSection] = useState<Record<string, EditedState>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  const currentSectionData = allData?.sections.find(s => s.section.key === selectedSection)
  const currentFields = currentSectionData?.fields || []
  const currentEdited = selectedSection ? editedPerSection[selectedSection] : undefined
  const hasChanges = currentEdited ? hasAnyChanges(currentFields, currentEdited) : false

  const loadData = useCallback(async () => {
    setLoading(true)
    setAllData(null)
    setSelectedSection(null)
    setEditedPerSection({})
    setImageUrls({})
    try {
      const data = await getAllCmsData(site.id)
      setAllData(data)
      const editedMap: Record<string, EditedState> = {}
      const allImagePaths: string[] = []
      for (const s of data.sections) {
        editedMap[s.section.key] = buildInitialEdited(s.fields)
        for (const f of s.fields) {
          if (f.type === 'string' && isImageValue(f.value)) allImagePaths.push(f.value)
          if (f.type === 'object_array') {
            for (const item of f.items) {
              for (const val of Object.values(item)) {
                if (isImageValue(val)) allImagePaths.push(val)
              }
            }
          }
        }
      }
      setEditedPerSection(editedMap)
      if (data.sections.length > 0) {
        setSelectedSection(data.sections[0].section.key)
      }
      if (allImagePaths.length > 0) {
        const urls = await getCmsImageUrls(site.id, allImagePaths)
        setImageUrls(urls)
      }
    } catch {
      // noop
    }
    setLoading(false)
  }, [site.id])

  useEffect(() => { loadData() }, [loadData])

  const updateString = useCallback((name: string, value: string) => {
    if (!selectedSection) return
    setEditedPerSection(prev => ({
      ...prev,
      [selectedSection]: { ...prev[selectedSection], strings: { ...prev[selectedSection].strings, [name]: value } }
    }))
  }, [selectedSection])

  const updateStringArray = useCallback((name: string, value: string[]) => {
    if (!selectedSection) return
    setEditedPerSection(prev => ({
      ...prev,
      [selectedSection]: { ...prev[selectedSection], stringArrays: { ...prev[selectedSection].stringArrays, [name]: value } }
    }))
  }, [selectedSection])

  const updateObjectArray = useCallback((name: string, value: Record<string, string>[]) => {
    if (!selectedSection) return
    setEditedPerSection(prev => ({
      ...prev,
      [selectedSection]: { ...prev[selectedSection], objectArrays: { ...prev[selectedSection].objectArrays, [name]: value } }
    }))
  }, [selectedSection])

  async function handleSave() {
    if (!selectedSection || !currentEdited || !hasChanges) return
    setSaving(true)
    setSaveSuccess(false)
    const updates = buildUpdates(currentFields, currentEdited)
    const result = await updateCmsFields(site.id, selectedSection, updates)
    setSaving(false)
    if (!result.success) {
      setSaveError(result.error || 'Erreur lors de la publication')
      setTimeout(() => setSaveError(''), 5000)
      return
    }
    setSaveSuccess(true)
    loadData()
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  function handleReset() {
    if (!selectedSection) return
    setEditedPerSection(prev => ({
      ...prev,
      [selectedSection]: buildInitialEdited(currentFields)
    }))
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left: Sections */}
      <div className="w-56 shrink-0 border-r border-[#1e1e1e] flex flex-col min-h-0">
        <div className="px-4 py-3.5 border-b border-[#1e1e1e] shrink-0">
          <div className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest">Contenu du site</div>
          <div className="text-[10px] text-[#52525b] mt-0.5">{site.project_name || site.site_url}</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <span className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest px-1">Sections</span>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="text-[#52525b] hover:text-white transition-colors cursor-pointer p-1 disabled:opacity-30"
              title="Rafraîchir"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : allData && allData.sections.length === 0 ? (
            <p className="text-[10px] text-[#52525b] text-center py-6">Aucune section trouvée</p>
          ) : (
            allData?.sections.map(({ section }) => {
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
        </div>
      </div>

      {/* Right: Fields */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : !selectedSection ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <DocumentIcon className="w-5 h-5 text-[#a1a1aa]" />
            </div>
            <p className="text-[#a1a1aa] text-sm">Sélectionnez une section</p>
            <p className="text-[#52525b] text-xs mt-1">Choisissez la section à modifier</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e1e] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <DocumentIcon className="w-4 h-4 text-[#a1a1aa] shrink-0" />
                <span className="text-sm font-medium text-white truncate">
                  {currentSectionData?.section.name || selectedSection}
                </span>
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
              {currentFields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-[#a1a1aa] text-sm">Aucun champ modifiable</p>
                </div>
              ) : (
                currentFields.map(field => {
                  if (field.type === 'string') {
                    const val = currentEdited?.strings[field.name] ?? field.value
                    if (isImageValue(val) || isImageValue(field.value)) {
                      return (
                        <ImageFieldEditor
                          key={field.name}
                          field={field}
                          value={val}
                          onChange={v => updateString(field.name, v)}
                          previewUrl={imageUrls[val] || imageUrls[field.value]}
                          siteId={site.id}
                          onUploaded={(newPath, localPreview) => {
                            setImageUrls(prev => ({ ...prev, [newPath]: localPreview }))
                          }}
                        />
                      )
                    }
                    return (
                      <StringFieldEditor
                        key={field.name}
                        field={field}
                        value={val}
                        onChange={v => updateString(field.name, v)}
                      />
                    )
                  }
                  if (field.type === 'string_array') {
                    return (
                      <StringArrayFieldEditor
                        key={field.name}
                        field={field}
                        items={currentEdited?.stringArrays[field.name] ?? field.items}
                        onChange={v => updateStringArray(field.name, v)}
                      />
                    )
                  }
                  if (field.type === 'object_array') {
                    return (
                      <ObjectArrayFieldEditor
                        key={field.name}
                        field={field}
                        items={currentEdited?.objectArrays[field.name] ?? field.items}
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

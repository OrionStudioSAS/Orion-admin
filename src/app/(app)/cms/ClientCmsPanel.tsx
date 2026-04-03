'use client'

import { useState, useEffect } from 'react'
import { DocumentIcon, CheckIcon, XIcon, ExternalLinkIcon } from '@/components/ui/Icons'
import { ClientSite, CmsSection, CmsField, getCmsSections, getCmsSectionFields, updateCmsFields } from '@/app/actions/cms'

interface Props {
  site: ClientSite
}

export default function ClientCmsPanel({ site }: Props) {
  const [sections, setSections] = useState<CmsSection[]>([])
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [fields, setFields] = useState<CmsField[]>([])
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [loadingSections, setLoadingSections] = useState(true)
  const [loadingFields, setLoadingFields] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load sections on mount
  useEffect(() => {
    getCmsSections(site.id).then(s => {
      setSections(s)
      setLoadingSections(false)
    }).catch(() => setLoadingSections(false))
  }, [site.id])

  // Load fields when section changes
  useEffect(() => {
    if (!selectedSection) { setFields([]); return }
    setLoadingFields(true)
    setFields([])
    setEditedValues({})
    getCmsSectionFields(site.id, selectedSection).then(data => {
      setFields(data.fields)
      const initial: Record<string, string> = {}
      data.fields.forEach(f => { initial[f.id] = f.value })
      setEditedValues(initial)
      setLoadingFields(false)
    }).catch(() => setLoadingFields(false))
  }, [site.id, selectedSection])

  const hasChanges = fields.some(f => editedValues[f.id] !== f.value)

  async function handleSave() {
    if (!selectedSection || !hasChanges) return
    setSaving(true)
    setSaveSuccess(false)
    const updates = fields
      .filter(f => editedValues[f.id] !== f.value)
      .map(f => ({ id: f.id, value: editedValues[f.id] }))

    await updateCmsFields(site.id, selectedSection, updates)

    setSaving(false)
    setSaveSuccess(true)
    setFields(prev => prev.map(f => {
      const update = updates.find(u => u.id === f.id)
      return update ? { ...f, value: update.value } : f
    }))
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  function handleReset() {
    const initial: Record<string, string> = {}
    fields.forEach(f => { initial[f.id] = f.value })
    setEditedValues(initial)
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left: Sections */}
      <div className="w-56 shrink-0 border-r border-[#1e1e1e] flex flex-col min-h-0">
        <div className="px-4 py-3.5 border-b border-[#1e1e1e] shrink-0">
          <div className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest">Sections</div>
          <div className="text-[10px] text-[#52525b] mt-0.5">{site.project_name || site.site_url}</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingSections ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : sections.length === 0 ? (
            <p className="text-[10px] text-[#52525b] text-center py-6">Aucune section trouvée</p>
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
        </div>
      </div>

      {/* Right: Fields */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!selectedSection ? (
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
                  {sections.find(s => s.key === selectedSection)?.name || selectedSection}
                </span>
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
                </div>
              ) : (
                fields.map(field => (
                  <div key={field.id}>
                    <label className="text-xs font-medium text-white mb-1.5 block">{field.label}</label>
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

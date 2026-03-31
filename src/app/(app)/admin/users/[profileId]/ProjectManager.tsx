'use client'

import { useState, useTransition, useRef } from 'react'
import { upsertProject, deleteProjectFile, uploadProjectFile } from '@/app/actions/projects'
import { Project, ProjectFile } from '@/types/database'
import { CheckIcon, TrashIcon, UploadIcon, PlusIcon } from '@/components/ui/Icons'

const PLAN_OPTIONS = [
  { value: '', label: 'Non défini' },
  { value: 'webflow_creation', label: 'Création Webflow' },
  { value: 'shopify_creation', label: 'Création Shopify' },
  { value: 'webflow_refonte', label: 'Refonte Webflow' },
  { value: 'shopify_refonte', label: 'Refonte Shopify' },
  { value: 'autre', label: 'Autre' },
]

const STATUS_OPTIONS = [
  { value: 'en_cours', label: 'En cours', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { value: 'en_pause', label: 'En pause', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  { value: 'termine', label: 'Terminé', color: 'text-green-400 border-green-500/30 bg-green-500/10' },
]

const CATEGORIES = [
  { key: 'resource', label: 'Ressources', desc: 'Audits, plans d\'action, rapports' },
  { key: 'quote', label: 'Devis', desc: 'Devis de prestation' },
  { key: 'invoice', label: 'Factures', desc: 'Factures et reçus' },
] as const

const inputClass = "w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
const labelClass = "block text-[10px] text-[#a1a1aa] uppercase tracking-widest mb-2"

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  profileId: string
  project: Project | null
  files: ProjectFile[]
}

export default function ProjectManager({ profileId, project, files }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    plan_type: project?.plan_type || '',
    status: project?.status || 'en_cours',
    figma_url: project?.figma_url || '',
    site_url: project?.site_url || '',
    notes: project?.notes || '',
  })

  // File upload state per category
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  function handleChange(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
      setSaved(false)
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await upsertProject(profileId, {
        plan_type: (form.plan_type || null) as Project['plan_type'],
        status: form.status as Project['status'],
        figma_url: form.figma_url || null,
        site_url: form.site_url || null,
        notes: form.notes || null,
      })
      setSaved(true)
    })
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, category: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setUploadName(file.name.replace(/\.[^.]+$/, '')) // name without extension
    setUploadingCategory(category)
    setUploadError('')
  }

  async function handleUpload() {
    if (!pendingFile || !uploadingCategory || !uploadName.trim()) return
    setUploadLoading(true)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', pendingFile)
      fd.append('profileId', profileId)
      fd.append('category', uploadingCategory)
      fd.append('name', uploadName.trim())
      await uploadProjectFile(fd)
      setPendingFile(null)
      setUploadName('')
      setUploadingCategory(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur upload')
    }
    setUploadLoading(false)
  }

  function handleDelete(fileId: string, storagePath: string) {
    if (!confirm('Supprimer ce fichier définitivement ?')) return
    startTransition(async () => {
      await deleteProjectFile(fileId, storagePath)
    })
  }

  return (
    <div className="space-y-5">
      {/* Paramètres projet */}
      <form onSubmit={handleSave} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4 md:p-6">
        <h2 className="text-xs font-semibold text-white uppercase tracking-widest mb-5">Paramètres du projet</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Offre / Plan</label>
            <select value={form.plan_type} onChange={handleChange('plan_type')} className={inputClass}>
              {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Statut</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { setForm(p => ({ ...p, status: s.value as Project['status'] })); setSaved(false) }}
                  className={`flex-1 text-[10px] font-semibold py-2 rounded-lg border transition-all
                    ${form.status === s.value ? s.color : 'text-[#a1a1aa] border-[#1e1e1e] bg-transparent hover:border-white/10'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>URL Figma</label>
            <input type="url" value={form.figma_url} onChange={handleChange('figma_url')} placeholder="https://figma.com/..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>URL du site</label>
            <input type="url" value={form.site_url} onChange={handleChange('site_url')} placeholder="https://monsite.fr" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Note pour le client</label>
            <textarea
              value={form.notes}
              onChange={handleChange('notes')}
              rows={3}
              placeholder="Informations importantes, prochaines étapes..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all"
        >
          {saved && <CheckIcon className="w-3.5 h-3.5" />}
          {isPending ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </form>

      {/* Sections fichiers */}
      {CATEGORIES.map(({ key, label, desc }) => {
        const catFiles = files.filter(f => f.category === key)
        const isUploading = uploadingCategory === key

        return (
          <div key={key} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
              <div>
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-xs text-[#a1a1aa] mt-0.5">{desc}</div>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                <PlusIcon className="w-3 h-3" />
                Ajouter
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => handleFileSelect(e, key)}
                />
              </label>
            </div>

            {/* Upload form */}
            {isUploading && pendingFile && (
              <div className="px-5 py-4 bg-white/3 border-b border-[#1e1e1e] flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#a1a1aa] mb-1">Nom affiché</div>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={e => setUploadName(e.target.value)}
                    placeholder="Ex : Plan d'action personnalisé"
                    className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
                    autoFocus
                  />
                  <div className="text-[10px] text-[#a1a1aa] mt-1">{pendingFile.name} · {formatBytes(pendingFile.size)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploadLoading || !uploadName.trim()}
                    className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all"
                  >
                    <UploadIcon className="w-3.5 h-3.5" />
                    {uploadLoading ? 'Envoi...' : 'Uploader'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPendingFile(null); setUploadingCategory(null); setUploadName('') }}
                    className="text-[#a1a1aa] text-xs px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all"
                  >
                    Annuler
                  </button>
                </div>
                {uploadError && <p className="text-xs text-red-400 w-full">{uploadError}</p>}
              </div>
            )}

            {/* File list */}
            {catFiles.length === 0 && !isUploading ? (
              <div className="px-5 py-6 text-center">
                <p className="text-[#52525b] text-xs">Aucun fichier. Cliquez sur Ajouter pour en uploader un.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#0a0a0a]">
                {catFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-3 md:gap-4 px-5 py-3 bg-[#080808]/30">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{file.name}</div>
                      <div className="text-[10px] text-[#a1a1aa] mt-0.5">
                        {file.original_name}
                        {file.size_bytes ? ` · ${formatBytes(file.size_bytes)}` : ''}
                        {' · '}{new Date(file.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(file.id, file.storage_path)}
                      disabled={isPending}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

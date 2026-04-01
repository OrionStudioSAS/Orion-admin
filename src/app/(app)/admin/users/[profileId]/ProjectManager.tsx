'use client'

import { useState, useTransition, useRef } from 'react'
import { updateProjectById, deleteProjectFile, uploadProjectFile, sendProjectNotification, toggleFileVisibility, addProjectLink, getDownloadUrl, updateFileInvoice } from '@/app/actions/projects'
import { Project, ProjectFile } from '@/types/database'
import { CheckIcon, TrashIcon, UploadIcon, PlusIcon, BellIcon, SendIcon, EyeIcon, EyeOffIcon, LinkIcon } from '@/components/ui/Icons'

const PLAN_OPTIONS = [
  { value: '', label: 'Non défini' },
  { value: 'webflow_creation', label: 'Création Webflow' },
  { value: 'shopify_creation', label: 'Création Shopify' },
  { value: 'webflow_refonte', label: 'Refonte Webflow' },
  { value: 'shopify_refonte', label: 'Refonte Shopify' },
  { value: 'automation', label: 'Automation' },
  { value: 'design', label: 'Design' },
  { value: 'maintenance', label: 'Maintenance' },
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

const PRESET_MESSAGES = [
  { label: 'Espace mis à jour', text: '👋 Bonjour, votre espace Orion Studio a été mis à jour. Connectez-vous pour voir les dernières nouveautés !' },
  { label: 'Projet démarré', text: '🚀 Votre projet vient de démarrer ! Connectez-vous à votre espace pour suivre son avancement.' },
  { label: 'Action requise', text: '👋 Une action est requise de votre part sur votre projet. Connectez-vous dès que possible pour en savoir plus.' },
  { label: 'Projet terminé', text: '🎉 Bonne nouvelle ! Votre projet est terminé. Connectez-vous pour le découvrir.' },
]

interface Props {
  projectId: string
  profileId: string
  project: Project
  files: ProjectFile[]
  whatsappConfigured: boolean
  hasPhone: boolean
}

export default function ProjectManager({ projectId, profileId, project, files, whatsappConfigured, hasPhone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: project.name || '',
    plan_type: project.plan_type || '',
    status: project.status || 'en_cours',
    figma_url: project.figma_url || '',
    site_url: project.site_url || '',
    staging_url: project.staging_url || '',
    google_business_url: project.google_business_url || '',
    deadline: project.deadline || '',
    notes: project.notes || '',
  })

  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // File upload state per category
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadVisible, setUploadVisible] = useState(true)

  // Link add state
  const [linkCategory, setLinkCategory] = useState<string | null>(null)
  const [linkForm, setLinkForm] = useState({ name: '', url: '', visible: true })
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState('')

  // WhatsApp state
  const [waMessage, setWaMessage] = useState('')
  const [waSending, setWaSending] = useState(false)
  const [waStatus, setWaStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [waError, setWaError] = useState('')

  function handleChange(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
      setSaved(false)
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await updateProjectById(projectId, profileId, {
        name: form.name.trim() || null,
        plan_type: (form.plan_type || null) as Project['plan_type'],
        status: form.status as Project['status'],
        figma_url: form.figma_url || null,
        site_url: form.site_url || null,
        staging_url: form.staging_url || null,
        google_business_url: form.google_business_url || null,
        deadline: form.deadline || null,
        notes: form.notes || null,
      })
      setSaved(true)
    })
  }

  async function handleDownload(fileId: string, storagePath: string, fileName: string) {
    setDownloadingId(fileId)
    try {
      const url = await getDownloadUrl(storagePath)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
    } catch {
      // silently fail
    }
    setDownloadingId(null)
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
      fd.append('projectId', projectId)
      fd.append('profileId', profileId)
      fd.append('category', uploadingCategory)
      fd.append('name', uploadName.trim())
      fd.append('visibleToClient', String(uploadVisible))
      await uploadProjectFile(fd)
      setPendingFile(null)
      setUploadName('')
      setUploadingCategory(null)
      setUploadVisible(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur upload')
    }
    setUploadLoading(false)
  }

  function handleToggleVisibility(fileId: string, current: boolean) {
    startTransition(async () => {
      await toggleFileVisibility(fileId, !current, profileId, projectId)
    })
  }

  async function handleAddLink(category: string) {
    if (!linkForm.name.trim() || !linkForm.url.trim()) return
    setLinkLoading(true)
    setLinkError('')
    try {
      await addProjectLink(projectId, profileId, {
        category: category as 'resource' | 'invoice' | 'quote',
        name: linkForm.name.trim(),
        url: linkForm.url.trim(),
        visibleToClient: linkForm.visible,
      })
      setLinkForm({ name: '', url: '', visible: true })
      setLinkCategory(null)
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Erreur')
    }
    setLinkLoading(false)
  }

  async function handleWaSend() {
    if (!waMessage.trim() || waSending) return
    setWaSending(true)
    setWaStatus('idle')
    setWaError('')
    try {
      await sendProjectNotification(profileId, waMessage.trim())
      setWaStatus('sent')
      setWaMessage('')
      setTimeout(() => setWaStatus('idle'), 3000)
    } catch (err) {
      setWaStatus('error')
      setWaError(err instanceof Error ? err.message : 'Erreur envoi')
    }
    setWaSending(false)
  }

  function handleDelete(fileId: string, storagePath: string | null) {
    if (!confirm('Supprimer ce fichier définitivement ?')) return
    startTransition(async () => {
      await deleteProjectFile(fileId, storagePath, projectId, profileId)
    })
  }

  return (
    <div className="space-y-5">
      {/* Paramètres projet */}
      <form onSubmit={handleSave} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4 md:p-6">
        <h2 className="text-xs font-semibold text-white uppercase tracking-widest mb-5">Paramètres du projet</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nom du projet</label>
            <input type="text" value={form.name} onChange={handleChange('name')} placeholder="Ex : Refonte site Acme, Boutique Shopify..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Offre / Plan</label>
            <select value={form.plan_type} onChange={handleChange('plan_type')} className={`${inputClass} cursor-pointer`}>
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
                  className={`flex-1 text-[10px] font-semibold py-2 rounded-lg border transition-all cursor-pointer
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
          <div>
            <label className={labelClass}>URL Staging / Dev</label>
            <input type="url" value={form.staging_url} onChange={handleChange('staging_url')} placeholder="https://staging.monsite.fr" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fiche Google Business</label>
            <input type="url" value={form.google_business_url} onChange={handleChange('google_business_url')} placeholder="https://g.page/..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date de livraison</label>
            <input type="date" value={form.deadline} onChange={handleChange('deadline')} className={`${inputClass} [color-scheme:dark]`} />
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
          className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
        >
          {saved && <CheckIcon className="w-3.5 h-3.5" />}
          {isPending ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </form>

      {/* WhatsApp notifications */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <BellIcon className="w-4 h-4 text-[#a1a1aa]" />
          <h2 className="text-xs font-semibold text-white uppercase tracking-widest">Notification WhatsApp</h2>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-4 mt-2">
          {!whatsappConfigured ? (
            <span className="text-[10px] text-yellow-500 border border-yellow-500/20 bg-yellow-500/5 rounded-full px-2.5 py-1">
              ⚠️ Twilio non configuré (variables manquantes)
            </span>
          ) : !hasPhone ? (
            <span className="text-[10px] text-[#a1a1aa] border border-[#1e1e1e] rounded-full px-2.5 py-1">
              📵 Aucun numéro de téléphone pour cet utilisateur
            </span>
          ) : (
            <span className="text-[10px] text-green-400 border border-green-500/20 bg-green-500/5 rounded-full px-2.5 py-1">
              ✓ Prêt — les messages automatiques sont actifs
            </span>
          )}
        </div>

        {/* Preset messages */}
        <div className="mb-4">
          <div className={labelClass}>Messages rapides</div>
          <div className="flex flex-wrap gap-2">
            {PRESET_MESSAGES.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => setWaMessage(p.text)}
                disabled={!whatsappConfigured || !hasPhone}
                className="text-[10px] text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom message */}
        <div className="flex items-end gap-2">
          <textarea
            value={waMessage}
            onChange={e => { setWaMessage(e.target.value); setWaStatus('idle') }}
            placeholder="Ou tapez un message personnalisé..."
            rows={3}
            disabled={!whatsappConfigured || !hasPhone}
            className={`flex-1 ${inputClass} resize-none disabled:opacity-40`}
          />
          <button
            type="button"
            onClick={handleWaSend}
            disabled={!whatsappConfigured || !hasPhone || !waMessage.trim() || waSending}
            className="h-[88px] w-10 flex items-center justify-center bg-white text-black rounded-xl hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
          >
            {waSending ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <SendIcon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {waStatus === 'sent' && (
          <p className="text-xs text-green-400 mt-2 flex items-center gap-1.5">
            <CheckIcon className="w-3 h-3" /> Message envoyé avec succès
          </p>
        )}
        {waStatus === 'error' && (
          <p className="text-xs text-red-400 mt-2">{waError}</p>
        )}
      </div>

      {/* Sections fichiers */}
      {CATEGORIES.map(({ key, label, desc }) => {
        const catFiles = files.filter(f => f.category === key)
        const isUploading = uploadingCategory === key
        const isAddingLink = linkCategory === key

        return (
          <div key={key} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
              <div>
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-xs text-[#a1a1aa] mt-0.5">{desc}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setLinkCategory(isAddingLink ? null : key); setLinkForm({ name: '', url: '', visible: true }); setLinkError('') }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer
                    ${isAddingLink ? 'bg-white text-black border-white' : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
                >
                  <LinkIcon className="w-3 h-3" />
                  Lien
                </button>
                <label className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                  <PlusIcon className="w-3 h-3" />
                  Fichier
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={e => handleFileSelect(e, key)}
                  />
                </label>
              </div>
            </div>

            {/* Add link form */}
            {isAddingLink && (
              <div className="px-5 py-4 bg-[#080808]/50 border-b border-[#1e1e1e]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-[#a1a1aa] mb-1">Nom affiché</div>
                    <input
                      type="text"
                      value={linkForm.name}
                      onChange={e => setLinkForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ex : Maquette Figma, Brief..."
                      className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
                      autoFocus
                    />
                  </div>
                  <div>
                    <div className="text-xs text-[#a1a1aa] mb-1">URL</div>
                    <input
                      type="url"
                      value={linkForm.url}
                      onChange={e => setLinkForm(p => ({ ...p, url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkForm.visible}
                      onChange={e => setLinkForm(p => ({ ...p, visible: e.target.checked }))}
                      className="w-4 h-4 accent-white rounded"
                    />
                    <span className="text-xs text-[#a1a1aa]">Visible par le client</span>
                  </label>
                </div>
                {linkError && <p className="text-xs text-red-400 mb-2">{linkError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddLink(key)}
                    disabled={linkLoading || !linkForm.name.trim() || !linkForm.url.trim()}
                    className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {linkLoading ? 'Ajout...' : 'Ajouter le lien'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkCategory(null)}
                    className="text-[#a1a1aa] text-xs px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Upload form */}
            {isUploading && pendingFile && (
              <div className="px-5 py-4 bg-white/3 border-b border-[#1e1e1e] flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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
                      className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <UploadIcon className="w-3.5 h-3.5" />
                      {uploadLoading ? 'Envoi...' : 'Uploader'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPendingFile(null); setUploadingCategory(null); setUploadName(''); setUploadVisible(true) }}
                      className="text-[#a1a1aa] text-xs px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={uploadVisible}
                    onChange={e => setUploadVisible(e.target.checked)}
                    className="w-4 h-4 accent-white rounded"
                  />
                  <span className="text-xs text-[#a1a1aa]">Visible par le client</span>
                </label>
                {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
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
                    {/* Type icon */}
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0
                      ${file.type === 'link' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
                      {file.type === 'link'
                        ? <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                        : <svg className="w-3 h-3 text-[#a1a1aa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" /><polyline points="14 2 14 8 20 8" strokeLinejoin="round" /></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{file.name}</span>
                        {!file.visible_to_client && (
                          <span className="text-[9px] text-[#52525b] border border-[#1e1e1e] rounded-full px-2 py-0.5 shrink-0">Admin only</span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#a1a1aa] mt-0.5">
                        {file.type === 'link' && file.url && <span className="truncate block max-w-xs">{file.url}</span>}
                        {file.type !== 'link' && file.original_name && (
                          <>{file.original_name}{file.size_bytes ? ` · ${formatBytes(file.size_bytes)}` : ''} · {new Date(file.created_at).toLocaleDateString('fr-FR')}</>
                        )}
                      </div>
                      {file.category === 'invoice' && (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            placeholder="Montant HT (€)"
                            defaultValue={file.amount_ht ?? ''}
                            onBlur={e => {
                              const val = e.target.value ? parseFloat(e.target.value) : null
                              if (val !== file.amount_ht) updateFileInvoice(file.id, { amount_ht: val }, profileId, projectId)
                            }}
                            className="w-28 bg-[#080808] border border-[#1e1e1e] text-white text-[10px] rounded px-2 py-1 placeholder-[#3f3f46] focus:outline-none focus:border-white/30"
                          />
                          <button
                            type="button"
                            onClick={() => updateFileInvoice(file.id, { is_paid: !file.is_paid }, profileId, projectId)}
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer
                              ${file.is_paid
                                ? 'text-green-400 bg-green-500/10 border-green-500/30'
                                : 'text-[#a1a1aa] bg-white/5 border-white/10 hover:border-white/20'}`}
                          >
                            {file.is_paid ? 'Payé ✓' : 'Non payé'}
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Open link or download file */}
                    {file.type === 'link' && file.url ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-all"
                        title="Ouvrir le lien"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" /><polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" /><line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" /></svg>
                      </a>
                    ) : file.storage_path ? (
                      <button
                        type="button"
                        onClick={() => handleDownload(file.id, file.storage_path!, file.original_name || file.name)}
                        disabled={downloadingId === file.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-all disabled:opacity-40 cursor-pointer"
                        title="Télécharger"
                      >
                        {downloadingId === file.id
                          ? <div className="w-3.5 h-3.5 border border-[#a1a1aa] border-t-transparent rounded-full animate-spin" />
                          : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" /><polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" /></svg>
                        }
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleToggleVisibility(file.id, file.visible_to_client)}
                      disabled={isPending}
                      title={file.visible_to_client ? 'Masquer au client' : 'Rendre visible au client'}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-pointer
                        ${file.visible_to_client ? 'text-[#a1a1aa] hover:text-white hover:bg-white/5' : 'text-[#52525b] hover:text-green-400 hover:bg-green-500/10'}`}
                    >
                      {file.visible_to_client ? <EyeIcon className="w-3.5 h-3.5" /> : <EyeOffIcon className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(file.id, file.storage_path ?? null)}
                      disabled={isPending}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
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

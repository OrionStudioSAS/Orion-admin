'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { Profile, Project, ProjectFile, ClientDocument } from '@/types/database'
import {
  CheckIcon, TrashIcon, UploadIcon, PlusIcon, EyeIcon, EyeOffIcon,
  LinkIcon, DownloadIcon, FolderIcon, KeyRotateIcon, ShieldIcon,
} from '@/components/ui/Icons'
import {
  updateClientProfile, resetClientPassword,
  addClientLink, uploadClientFile,
  toggleDocumentVisibility, deleteClientDocument, getClientDocUrl,
} from '@/app/actions/clients'

const inputClass = "w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#52525b] focus:outline-none focus:border-white/30 transition-colors"
const labelClass = "block text-[10px] text-[#a1a1aa] uppercase tracking-widest mb-1.5"

const PLAN_LABELS: Record<string, string> = {
  webflow_creation: 'Création Webflow', shopify_creation: 'Création Shopify',
  webflow_refonte: 'Refonte Webflow', shopify_refonte: 'Refonte Shopify', autre: 'Autre',
}
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  en_cours: { label: 'En cours', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  termine: { label: 'Terminé', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  en_pause: { label: 'En pause', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  client: Profile
  project: Project | null
  projectFiles: ProjectFile[]
  documents: ClientDocument[]
}

export default function ClientView({ client, project, projectFiles, documents }: Props) {
  const [isPending, startTransition] = useTransition()

  // --- Profile form ---
  const [profileForm, setProfileForm] = useState({
    full_name: client.full_name || '',
    company: client.company || '',
    phone: client.phone || '',
    website: client.website || '',
  })
  const [profileSaved, setProfileSaved] = useState(false)

  function handleProfileChange(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setProfileForm(p => ({ ...p, [key]: e.target.value }))
      setProfileSaved(false)
    }
  }

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await updateClientProfile(client.id, {
        full_name: profileForm.full_name || null,
        company: profileForm.company || null,
        phone: profileForm.phone || null,
        website: profileForm.website || null,
      })
      setProfileSaved(true)
    })
  }

  // --- Password reset ---
  const [showPwdForm, setShowPwdForm] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleResetPwd(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd.length < 8) return
    setPwdLoading(true)
    setPwdMsg(null)
    try {
      await resetClientPassword(client.id, newPwd)
      setPwdMsg({ type: 'ok', text: 'Mot de passe mis à jour.' })
      setNewPwd('')
      setShowPwdForm(false)
    } catch (err) {
      setPwdMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erreur' })
    }
    setPwdLoading(false)
  }

  // --- Documents ---
  const [addMode, setAddMode] = useState<'link' | 'file' | null>(null)
  const [linkForm, setLinkForm] = useState({ name: '', url: '', visible: false })
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState('')

  const [fileForm, setFileForm] = useState({ name: '', visible: false })
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault()
    if (!linkForm.name.trim() || !linkForm.url.trim()) return
    setLinkLoading(true)
    setLinkError('')
    try {
      await addClientLink(client.id, linkForm.name.trim(), linkForm.url.trim(), linkForm.visible)
      setLinkForm({ name: '', url: '', visible: false })
      setAddMode(null)
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Erreur')
    }
    setLinkLoading(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPendingFile(f)
    setFileForm(p => ({ ...p, name: f.name.replace(/\.[^.]+$/, '') }))
  }

  async function handleUploadFile() {
    if (!pendingFile || !fileForm.name.trim()) return
    setFileLoading(true)
    setFileError('')
    try {
      const fd = new FormData()
      fd.append('file', pendingFile)
      fd.append('profileId', client.id)
      fd.append('name', fileForm.name.trim())
      fd.append('visibleToClient', String(fileForm.visible))
      await uploadClientFile(fd)
      setPendingFile(null)
      setFileForm({ name: '', visible: false })
      setAddMode(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Erreur')
    }
    setFileLoading(false)
  }

  function handleToggleVisibility(doc: ClientDocument) {
    startTransition(async () => {
      await toggleDocumentVisibility(doc.id, !doc.visible_to_client, client.id)
    })
  }

  function handleDeleteDoc(doc: ClientDocument) {
    if (!confirm('Supprimer ce document ?')) return
    startTransition(async () => {
      await deleteClientDocument(doc.id, doc.storage_path, client.id)
    })
  }

  async function handleDownload(doc: ClientDocument) {
    if (!doc.storage_path) return
    try {
      const url = await getClientDocUrl(doc.storage_path)
      window.open(url, '_blank')
    } catch {}
  }

  const status = project?.status ? STATUS_CONFIG[project.status] : null

  return (
    <div className="space-y-5">

      {/* Profil */}
      <form onSubmit={handleProfileSave} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 md:p-6">
        <h2 className="text-xs font-semibold text-white uppercase tracking-widest mb-5">Informations client</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Entreprise</label>
            <input type="text" value={profileForm.company} onChange={handleProfileChange('company')} placeholder="Nom de l'entreprise" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nom complet</label>
            <input type="text" value={profileForm.full_name} onChange={handleProfileChange('full_name')} placeholder="Prénom Nom" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input type="tel" value={profileForm.phone} onChange={handleProfileChange('phone')} placeholder="+33 6 12 34 56 78" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Site web</label>
            <input type="url" value={profileForm.website} onChange={handleProfileChange('website')} placeholder="https://..." className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Email (non modifiable)</label>
            <input type="email" value={client.email} disabled className={`${inputClass} opacity-40 cursor-not-allowed`} />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all"
        >
          {profileSaved && <CheckIcon className="w-3.5 h-3.5" />}
          {isPending ? 'Enregistrement...' : profileSaved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </form>

      {/* Sécurité */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ShieldIcon className="w-4 h-4 text-[#a1a1aa]" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-widest">Sécurité</h2>
          </div>
          <button
            onClick={() => { setShowPwdForm(p => !p); setPwdMsg(null) }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all
              ${showPwdForm ? 'bg-white text-black border-white' : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
          >
            <KeyRotateIcon className="w-3.5 h-3.5" />
            Réinitialiser le mot de passe
          </button>
        </div>

        {pwdMsg && (
          <p className={`text-xs mb-3 ${pwdMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{pwdMsg.text}</p>
        )}

        {showPwdForm && (
          <form onSubmit={handleResetPwd} className="flex items-end gap-3">
            <div className="flex-1">
              <label className={labelClass}>Nouveau mot de passe</label>
              <input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                minLength={8}
                required
                placeholder="8 caractères minimum"
                className={inputClass}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={pwdLoading || newPwd.length < 8}
              className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all shrink-0"
            >
              {pwdLoading ? 'Mise à jour...' : 'Confirmer'}
            </button>
            <button type="button" onClick={() => setShowPwdForm(false)} className="text-[#a1a1aa] text-xs px-3 py-2.5 rounded-lg hover:text-white hover:bg-white/5 transition-all shrink-0">
              Annuler
            </button>
          </form>
        )}

        {!showPwdForm && !pwdMsg && (
          <p className="text-xs text-[#52525b]">Définissez un nouveau mot de passe pour ce compte client ou admin.</p>
        )}
      </div>

      {/* Projet rapide */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <FolderIcon className="w-4 h-4 text-[#a1a1aa]" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-widest">Projet</h2>
          </div>
          <Link
            href={`/admin/users/${client.id}`}
            className="text-xs text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
          >
            Gérer le projet →
          </Link>
        </div>

        {!project ? (
          <p className="text-xs text-[#52525b]">Aucun projet configuré.</p>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            {status && (
              <span className={`text-[10px] font-semibold border px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
            )}
            {project.plan_type && (
              <span className="text-[10px] text-[#a1a1aa] bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">{PLAN_LABELS[project.plan_type] ?? project.plan_type}</span>
            )}
            <span className="text-xs text-[#52525b]">{projectFiles.length} fichier{projectFiles.length !== 1 ? 's' : ''}</span>
            {project.figma_url && (
              <a href={project.figma_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#a1a1aa] hover:text-white underline underline-offset-2 transition-colors">Figma</a>
            )}
            {project.site_url && (
              <a href={project.site_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#a1a1aa] hover:text-white underline underline-offset-2 transition-colors">Site</a>
            )}
            {project.monday_url && (
              <a href={project.monday_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#a1a1aa] hover:text-white underline underline-offset-2 transition-colors">Monday</a>
            )}
          </div>
        )}
      </div>

      {/* Documents & liens internes */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="text-xs font-semibold text-white uppercase tracking-widest">Documents & liens</h2>
            <p className="text-[10px] text-[#a1a1aa] mt-0.5">Visibles uniquement par l'admin, ou partagés avec le client</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddMode(addMode === 'link' ? null : 'link')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all
                ${addMode === 'link' ? 'bg-white text-black border-white' : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
            >
              <LinkIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Lien</span>
            </button>
            <button
              onClick={() => setAddMode(addMode === 'file' ? null : 'file')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all
                ${addMode === 'file' ? 'bg-white text-black border-white' : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
            >
              <PlusIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Fichier</span>
            </button>
          </div>
        </div>

        {/* Add link form */}
        {addMode === 'link' && (
          <form onSubmit={handleAddLink} className="px-5 py-4 border-b border-[#1e1e1e] bg-[#080808]/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>Nom *</label>
                <input type="text" value={linkForm.name} onChange={e => setLinkForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex : Contrat signé" required className={inputClass} autoFocus />
              </div>
              <div>
                <label className={labelClass}>URL *</label>
                <input type="url" value={linkForm.url} onChange={e => setLinkForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." required className={inputClass} />
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
            <div className="flex gap-2">
              <button type="submit" disabled={linkLoading} className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all">
                <LinkIcon className="w-3.5 h-3.5" />
                {linkLoading ? 'Ajout...' : 'Ajouter le lien'}
              </button>
              <button type="button" onClick={() => setAddMode(null)} className="text-[#a1a1aa] text-xs px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all">Annuler</button>
            </div>
          </form>
        )}

        {/* Add file form */}
        {addMode === 'file' && (
          <div className="px-5 py-4 border-b border-[#1e1e1e] bg-[#080808]/50">
            {!pendingFile ? (
              <label className="flex items-center justify-center gap-2 border border-dashed border-[#1e1e1e] rounded-xl p-6 cursor-pointer hover:border-white/20 transition-all">
                <UploadIcon className="w-4 h-4 text-[#a1a1aa]" />
                <span className="text-xs text-[#a1a1aa]">Sélectionner un fichier</span>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
              </label>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>Nom affiché *</label>
                    <input type="text" value={fileForm.name} onChange={e => setFileForm(p => ({ ...p, name: e.target.value }))} className={inputClass} autoFocus />
                    <p className="text-[10px] text-[#52525b] mt-1">{pendingFile.name} · {formatBytes(pendingFile.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fileForm.visible}
                      onChange={e => setFileForm(p => ({ ...p, visible: e.target.checked }))}
                      className="w-4 h-4 accent-white rounded"
                    />
                    <span className="text-xs text-[#a1a1aa]">Visible par le client</span>
                  </label>
                </div>
                {fileError && <p className="text-xs text-red-400 mb-2">{fileError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleUploadFile} disabled={fileLoading || !fileForm.name.trim()} className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all">
                    <UploadIcon className="w-3.5 h-3.5" />
                    {fileLoading ? 'Envoi...' : 'Uploader'}
                  </button>
                  <button onClick={() => { setPendingFile(null); setAddMode(null) }} className="text-[#a1a1aa] text-xs px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all">Annuler</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Document list */}
        {documents.length === 0 && !addMode ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[#52525b] text-xs">Aucun document. Ajoutez un lien ou un fichier.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#0a0a0a]">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5">
                {/* Type icon */}
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0
                  ${doc.type === 'link' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
                  {doc.type === 'link'
                    ? <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                    : <svg className="w-3.5 h-3.5 text-[#a1a1aa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" /><polyline points="14 2 14 8 20 8" strokeLinejoin="round" /></svg>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{doc.name}</span>
                    {doc.visible_to_client
                      ? <span className="text-[9px] text-green-400 border border-green-500/20 bg-green-500/5 rounded-full px-2 py-0.5 shrink-0">Visible client</span>
                      : <span className="text-[9px] text-[#52525b] border border-[#1e1e1e] rounded-full px-2 py-0.5 shrink-0">Admin only</span>
                    }
                  </div>
                  <div className="text-[10px] text-[#52525b] mt-0.5">
                    {doc.type === 'link' && doc.url && <span className="truncate block max-w-xs">{doc.url}</span>}
                    {doc.type === 'file' && doc.original_name && <span>{doc.original_name}{doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ''}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {doc.type === 'link' && doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-all">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" /><polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" /><line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" /></svg>
                    </a>
                  )}
                  {doc.type === 'file' && doc.storage_path && (
                    <button onClick={() => handleDownload(doc)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-all">
                      <DownloadIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleVisibility(doc)}
                    disabled={isPending}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                      ${doc.visible_to_client ? 'text-green-400 hover:bg-green-500/10' : 'text-[#52525b] hover:text-white hover:bg-white/5'}`}
                    title={doc.visible_to_client ? 'Masquer au client' : 'Rendre visible au client'}
                  >
                    {doc.visible_to_client ? <EyeIcon className="w-3.5 h-3.5" /> : <EyeOffIcon className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDeleteDoc(doc)}
                    disabled={isPending}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[#52525b] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

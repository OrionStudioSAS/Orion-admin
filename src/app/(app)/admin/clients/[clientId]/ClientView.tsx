'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Profile, Project, ProjectFile } from '@/types/database'
import { CheckIcon, FolderIcon, KeyRotateIcon, ShieldIcon } from '@/components/ui/Icons'
import { updateClientProfile, resetClientPassword } from '@/app/actions/clients'

const inputClass = "w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#52525b] focus:outline-none focus:border-white/30 transition-colors"
const labelClass = "block text-[10px] text-[#a1a1aa] uppercase tracking-widest mb-1.5"

const PLAN_LABELS: Record<string, string> = {
  webflow_creation: 'Création Webflow', shopify_creation: 'Création Shopify',
  webflow_refonte: 'Refonte Webflow', shopify_refonte: 'Refonte Shopify',
  automation: 'Automation', design: 'Design', maintenance: 'Maintenance', autre: 'Autre',
}
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  en_cours: { label: 'En cours', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  termine: { label: 'Terminé', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  en_pause: { label: 'En pause', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
}

interface Props {
  client: Profile
  project: Project | null
  projectFiles: ProjectFile[]
}

export default function ClientView({ client, project, projectFiles }: Props) {
  const [isPending, startTransition] = useTransition()

  // --- Profile form ---
  const [profileForm, setProfileForm] = useState({
    full_name: client.full_name || '',
    company: client.company || '',
    phone: client.phone || '',
    website: client.website || '',
    job_title: client.job_title || '',
    linkedin_url: client.linkedin_url || '',
    webflow_site: client.webflow_site || '',
    company_address: client.company_address || '',
    siret: client.siret || '',
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
        job_title: profileForm.job_title || null,
        linkedin_url: profileForm.linkedin_url || null,
        webflow_site: profileForm.webflow_site || null,
        company_address: profileForm.company_address || null,
        siret: profileForm.siret || null,
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
          <div>
            <label className={labelClass}>Métier</label>
            <input type="text" value={profileForm.job_title} onChange={handleProfileChange('job_title')} placeholder="Développeur, Designer..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>LinkedIn</label>
            <input type="url" value={profileForm.linkedin_url} onChange={handleProfileChange('linkedin_url')} placeholder="https://linkedin.com/in/..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Site Webflow</label>
            <input type="text" value={profileForm.webflow_site} onChange={handleProfileChange('webflow_site')} placeholder="mon-site.webflow.io" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>SIRET</label>
            <input type="text" value={profileForm.siret} onChange={handleProfileChange('siret')} placeholder="123 456 789 00012" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Adresse de l&apos;entreprise</label>
            <input type="text" value={profileForm.company_address} onChange={handleProfileChange('company_address')} placeholder="12 rue de la Paix, 75002 Paris" className={inputClass} />
          </div>
          <div>
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
          <p className="text-xs text-[#52525b]">Définissez un nouveau mot de passe pour ce compte.</p>
        )}
      </div>

      {/* Projet */}
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
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Prospect } from '@/types/database'
import { createProspect, updateProspect, deleteProspect, convertProspect } from '@/app/actions/prospects'
import { PlusIcon, TrashIcon, CheckIcon, XIcon, LinkedInIcon, UserPlusIcon, TargetIcon } from '@/components/ui/Icons'

const STATUS_OPTIONS: { value: Prospect['status']; label: string; color: string }[] = [
  { value: 'nouveau', label: 'Nouveau', color: 'text-[#a1a1aa] bg-white/5 border-white/10' },
  { value: 'contacte', label: 'Contacté', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'en_discussion', label: 'En discussion', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { value: 'rdv_pris', label: 'RDV pris', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { value: 'converti', label: 'Converti ✓', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { value: 'perdu', label: 'Perdu', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
]

const inputClass = "w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#52525b] focus:outline-none focus:border-white/30 transition-colors"
const labelClass = "block text-[10px] text-[#a1a1aa] uppercase tracking-widest mb-1.5"

const EMPTY_FORM = {
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  linkedin_url: '',
  website: '',
  sector: '',
  location: '',
  source: 'manuel',
  notes: '',
}

interface Props {
  prospects: Prospect[]
}

export default function ProspectionPanel({ prospects }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Prospect>>({})
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [convertForm, setConvertForm] = useState({ email: '', full_name: '', password: '' })
  const [convertLoading, setConvertLoading] = useState(false)
  const [convertError, setConvertError] = useState('')

  function handleFormChange(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) return
    setFormLoading(true)
    setFormError('')
    try {
      await createProspect({
        company_name: form.company_name.trim(),
        contact_name: form.contact_name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        linkedin_url: form.linkedin_url || undefined,
        website: form.website || undefined,
        sector: form.sector || undefined,
        location: form.location || undefined,
        source: form.source || 'manuel',
        notes: form.notes || undefined,
      })
      setForm(EMPTY_FORM)
      setShowAdd(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur')
    }
    setFormLoading(false)
  }

  function handleStatusChange(prospect: Prospect, status: Prospect['status']) {
    startTransition(async () => {
      await updateProspect(prospect.id, { status })
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer ce prospect ?')) return
    startTransition(async () => {
      await deleteProspect(id)
    })
  }

  function startEdit(prospect: Prospect) {
    setEditingId(prospect.id)
    setEditForm({
      company_name: prospect.company_name,
      contact_name: prospect.contact_name ?? '',
      email: prospect.email ?? '',
      phone: prospect.phone ?? '',
      linkedin_url: prospect.linkedin_url ?? '',
      website: prospect.website ?? '',
      sector: prospect.sector ?? '',
      location: prospect.location ?? '',
      notes: prospect.notes ?? '',
    })
  }

  function handleEditChange(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setEditForm(p => ({ ...p, [key]: e.target.value }))
    }
  }

  async function handleEditSave(id: string) {
    startTransition(async () => {
      await updateProspect(id, editForm)
      setEditingId(null)
    })
  }

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault()
    if (!convertingId) return
    setConvertLoading(true)
    setConvertError('')
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...convertForm, role: 'client' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur création compte')
      await convertProspect(convertingId)
      setConvertingId(null)
      setConvertForm({ email: '', full_name: '', password: '' })
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Erreur')
    }
    setConvertLoading(false)
  }

  function openConvert(prospect: Prospect) {
    setConvertForm({
      email: prospect.email ?? '',
      full_name: prospect.contact_name ?? '',
      password: '',
    })
    setConvertingId(prospect.id)
    setConvertError('')
  }

  // Filter
  const filtered = prospects.filter(p => {
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    const q = search.toLowerCase()
    const matchSearch = !q ||
      p.company_name.toLowerCase().includes(q) ||
      (p.contact_name ?? '').toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.sector ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  // Stats
  const stats = STATUS_OPTIONS.map(s => ({
    ...s,
    count: prospects.filter(p => p.status === s.value).length,
  }))

  return (
    <div className="space-y-6">

      {/* Génération IA — Placeholder */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <TargetIcon className="w-4 h-4 text-[#a1a1aa]" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white mb-1">Recherche automatique</h2>
            <p className="text-xs text-[#a1a1aa] leading-relaxed mb-4">
              Connectez un workflow n8n pour lancer des recherches automatiques sur LinkedIn, scrapper des sites web ou importer des prospects depuis une source externe.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Secteur d\'activité', placeholder: 'Ex : E-commerce, SaaS...' },
                { label: 'Localisation', placeholder: 'Ex : Paris, Lyon...' },
                { label: 'Taille', placeholder: 'TPE, PME, ETI...' },
              ].map(({ label, placeholder }) => (
                <div key={label}>
                  <label className={labelClass}>{label}</label>
                  <input type="text" placeholder={placeholder} disabled className={`${inputClass} opacity-40 cursor-not-allowed`} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                disabled
                className="flex items-center gap-2 bg-white/10 text-white/40 text-xs font-semibold px-4 py-2 rounded-lg cursor-not-allowed"
              >
                <LinkedInIcon className="w-3.5 h-3.5" />
                Lancer la recherche
              </button>
              <span className="text-[10px] text-[#52525b] border border-[#1e1e1e] rounded-full px-3 py-1">
                Workflow n8n non configuré
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gestion des prospects */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <h2 className="text-xs font-semibold text-white uppercase tracking-widest">Prospects</h2>
          <button
            onClick={() => setShowAdd(p => !p)}
            className="flex items-center gap-1.5 text-xs bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-all"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Nouveau prospect
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-0 border-b border-[#1e1e1e] overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${filterStatus === 'all' ? 'border-white text-white' : 'border-transparent text-[#52525b] hover:text-[#a1a1aa]'}`}
          >
            Tous ({prospects.length})
          </button>
          {stats.map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${filterStatus === s.value ? 'border-white text-white' : 'border-transparent text-[#52525b] hover:text-[#a1a1aa]'}`}
            >
              {s.label.replace(' ✓', '')} ({s.count})
            </button>
          ))}
        </div>

        {/* Add form */}
        {showAdd && (
          <form onSubmit={handleCreate} className="p-5 border-b border-[#1e1e1e] bg-[#080808]/50">
            <div className="text-xs font-semibold text-white uppercase tracking-widest mb-4">Ajouter un prospect</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className={labelClass}>Entreprise *</label>
                <input type="text" value={form.company_name} onChange={handleFormChange('company_name')} placeholder="Nom de l'entreprise" required className={inputClass} autoFocus />
              </div>
              <div>
                <label className={labelClass}>Contact</label>
                <input type="text" value={form.contact_name} onChange={handleFormChange('contact_name')} placeholder="Prénom Nom" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.email} onChange={handleFormChange('email')} placeholder="contact@entreprise.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input type="tel" value={form.phone} onChange={handleFormChange('phone')} placeholder="06 12 34 56 78" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Secteur</label>
                <input type="text" value={form.sector} onChange={handleFormChange('sector')} placeholder="E-commerce, SaaS..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Localisation</label>
                <input type="text" value={form.location} onChange={handleFormChange('location')} placeholder="Paris, Lyon..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>LinkedIn</label>
                <input type="url" value={form.linkedin_url} onChange={handleFormChange('linkedin_url')} placeholder="https://linkedin.com/in/..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Site web</label>
                <input type="url" value={form.website} onChange={handleFormChange('website')} placeholder="https://..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Source</label>
                <select value={form.source} onChange={handleFormChange('source')} className={inputClass}>
                  <option value="manuel">Manuel</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="referral">Recommandation</option>
                  <option value="site">Site web</option>
                  <option value="evenement">Événement</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelClass}>Notes</label>
                <textarea value={form.notes} onChange={handleFormChange('notes')} placeholder="Contexte, besoins identifiés..." rows={2} className={`${inputClass} resize-none`} />
              </div>
            </div>
            {formError && <p className="text-xs text-red-400 mb-3">{formError}</p>}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={formLoading || !form.company_name.trim()} className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all">
                <PlusIcon className="w-3.5 h-3.5" />
                {formLoading ? 'Ajout...' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM) }} className="text-[#a1a1aa] text-xs px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="px-5 py-3 border-b border-[#1e1e1e]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un prospect..."
              className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg pl-9 pr-4 py-2 placeholder-[#52525b] focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
        </div>

        {/* Prospect list */}
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[#52525b] text-sm">{search || filterStatus !== 'all' ? 'Aucun résultat.' : 'Aucun prospect. Cliquez sur "Nouveau prospect" pour commencer.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#0a0a0a]">
            {filtered.map(prospect => {
              const statusCfg = STATUS_OPTIONS.find(s => s.value === prospect.status)!
              const isEditing = editingId === prospect.id
              const isConverting = convertingId === prospect.id

              return (
                <div key={prospect.id}>
                  {/* Main row */}
                  <div className="flex items-center gap-3 md:gap-4 px-5 py-3.5 bg-[#080808]/20">
                    {/* Company initial */}
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 text-xs font-semibold text-white">
                      {prospect.company_name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{prospect.company_name}</span>
                        {prospect.sector && <span className="text-[10px] text-[#a1a1aa] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">{prospect.sector}</span>}
                        {prospect.location && <span className="text-[10px] text-[#52525b]">📍 {prospect.location}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {prospect.contact_name && <span className="text-xs text-[#a1a1aa]">{prospect.contact_name}</span>}
                        {prospect.email && <span className="text-xs text-[#52525b]">{prospect.email}</span>}
                        {prospect.phone && (
                          <a href={`tel:${prospect.phone}`} className="text-xs text-[#52525b] hover:text-white transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round"/></svg>
                            {prospect.phone}
                          </a>
                        )}
                        {prospect.source !== 'manuel' && <span className="text-[10px] text-[#52525b]">via {prospect.source}</span>}
                      </div>
                      {prospect.notes && (
                        <div className="mt-1.5 text-[11px] text-[#52525b] leading-relaxed line-clamp-2">{prospect.notes}</div>
                      )}
                    </div>

                    {/* Status */}
                    <select
                      value={prospect.status}
                      onChange={e => handleStatusChange(prospect, e.target.value as Prospect['status'])}
                      disabled={isPending}
                      className={`text-[10px] font-semibold border rounded-lg px-2 py-1.5 bg-transparent focus:outline-none cursor-pointer transition-all ${statusCfg.color}`}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value} className="bg-[#0f0f0f] text-white">{s.label}</option>
                      ))}
                    </select>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {prospect.linkedin_url && (
                        <a href={prospect.linkedin_url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-lg text-[#52525b] hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="LinkedIn">
                          <LinkedInIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {prospect.status !== 'converti' && (
                        <button
                          onClick={() => openConvert(prospect)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#52525b] hover:text-green-400 hover:bg-green-500/10 transition-all"
                          title="Convertir en client"
                        >
                          <UserPlusIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => isEditing ? setEditingId(null) : startEdit(prospect)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${isEditing ? 'bg-white text-black' : 'text-[#52525b] hover:text-white hover:bg-white/5'}`}
                        title="Modifier"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(prospect.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#52525b] hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Supprimer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Edit panel */}
                  {isEditing && (
                    <div className="px-5 py-4 border-t border-[#1e1e1e] bg-[#080808]/60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                        {[
                          { key: 'company_name', label: 'Entreprise', type: 'text' },
                          { key: 'contact_name', label: 'Contact', type: 'text' },
                          { key: 'email', label: 'Email', type: 'email' },
                          { key: 'phone', label: 'Téléphone', type: 'tel' },
                          { key: 'sector', label: 'Secteur', type: 'text' },
                          { key: 'location', label: 'Localisation', type: 'text' },
                          { key: 'linkedin_url', label: 'LinkedIn', type: 'url' },
                          { key: 'website', label: 'Site web', type: 'url' },
                        ].map(({ key, label, type }) => (
                          <div key={key}>
                            <label className={labelClass}>{label}</label>
                            <input
                              type={type}
                              value={(editForm as Record<string, string>)[key] ?? ''}
                              onChange={handleEditChange(key)}
                              className={inputClass}
                            />
                          </div>
                        ))}
                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className={labelClass}>Notes</label>
                          <textarea
                            value={(editForm.notes as string) ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                            rows={2}
                            className={`${inputClass} resize-none`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditSave(prospect.id)} disabled={isPending} className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all">
                          <CheckIcon className="w-3.5 h-3.5" />
                          {isPending ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-[#a1a1aa] text-xs px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Convert panel */}
                  {isConverting && (
                    <div className="px-5 py-4 border-t border-[#1e1e1e] bg-green-500/5">
                      <div className="flex items-center gap-2 mb-4">
                        <UserPlusIcon className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-semibold text-green-400 uppercase tracking-widest">Convertir en client</span>
                      </div>
                      <form onSubmit={handleConvert}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className={labelClass}>Nom complet</label>
                            <input type="text" value={convertForm.full_name} onChange={e => setConvertForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Prénom Nom" className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Email *</label>
                            <input type="email" required value={convertForm.email} onChange={e => setConvertForm(p => ({ ...p, email: e.target.value }))} placeholder="contact@entreprise.com" className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Mot de passe *</label>
                            <input type="password" required minLength={8} value={convertForm.password} onChange={e => setConvertForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" className={inputClass} />
                          </div>
                        </div>
                        <p className="text-[10px] text-[#a1a1aa] mb-3">Un compte client sera créé. Le prospect passera automatiquement en statut "Converti".</p>
                        {convertError && <p className="text-xs text-red-400 mb-3">{convertError}</p>}
                        <div className="flex items-center gap-2">
                          <button type="submit" disabled={convertLoading} className="flex items-center gap-2 bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-green-400 disabled:opacity-50 transition-all">
                            <UserPlusIcon className="w-3.5 h-3.5" />
                            {convertLoading ? 'Création...' : 'Créer le compte client'}
                          </button>
                          <button type="button" onClick={() => setConvertingId(null)} className="text-[#a1a1aa] text-xs px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all">
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

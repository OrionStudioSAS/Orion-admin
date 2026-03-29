'use client'

import { useState, useTransition } from 'react'
import { Flow } from '@/types/database'
import { PlusIcon, EditIcon, TrashIcon, BoltIcon, FlowIcon, CheckIcon, XIcon } from '@/components/ui/Icons'
import { createFlow, updateFlow, toggleFlowActive, deleteFlow } from '@/app/actions/flows'

interface Props {
  flows: Flow[]
}

const ICONS = ['bolt', 'document', 'layout', 'grid', 'key']
const CATEGORIES = ['Contenu', 'CMS', 'SEO', 'Marketing', 'Technique', 'Autre']

const emptyFlow = {
  name: '',
  description: '',
  webhook_url: '',
  category: 'Contenu',
  icon: 'bolt',
  is_active: true,
}

export default function FlowsManager({ flows }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyFlow })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function startEdit(flow: Flow) {
    setEditingId(flow.id)
    setForm({
      name: flow.name,
      description: flow.description || '',
      webhook_url: flow.webhook_url,
      category: flow.category || 'Contenu',
      icon: flow.icon,
      is_active: flow.is_active,
    })
    setShowCreate(false)
  }

  function cancelForm() {
    setShowCreate(false)
    setEditingId(null)
    setForm({ ...emptyFlow })
    setError('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createFlow(form)
      cancelForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
    setLoading(false)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setLoading(true)
    setError('')
    try {
      await updateFlow(editingId, form)
      cancelForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
    setLoading(false)
  }

  function handleToggleActive(flow: Flow) {
    startTransition(async () => {
      await toggleFlowActive(flow.id, flow.is_active)
    })
  }

  async function handleDelete(flowId: string) {
    if (!confirm('Supprimer ce flow définitivement ?')) return
    startTransition(async () => {
      await deleteFlow(flowId)
    })
  }

  const formContent = (
    <form onSubmit={editingId ? handleUpdate : handleCreate} className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 mb-6">
      <h3 className="text-sm font-semibold text-white mb-5">
        {editingId ? 'Modifier le flow' : 'Créer un flow'}
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-[10px] text-[#71717a] uppercase tracking-widest mb-2">Nom *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required
            placeholder="Création d'article"
            className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#71717a] uppercase tracking-widest mb-2">Catégorie</label>
          <select
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-white/30 transition-colors"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] text-[#71717a] uppercase tracking-widest mb-2">Webhook URL *</label>
          <input
            type="url"
            value={form.webhook_url}
            onChange={e => setForm(p => ({ ...p, webhook_url: e.target.value }))}
            required
            placeholder="https://n8n.votre-domaine.com/webhook/..."
            className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] text-[#71717a] uppercase tracking-widest mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Décrivez ce que fait ce flow..."
            rows={2}
            className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors resize-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#71717a] uppercase tracking-widest mb-2">Icône</label>
          <div className="flex gap-2">
            {ICONS.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm(p => ({ ...p, icon }))}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all
                  ${form.icon === icon ? 'bg-white border-white' : 'bg-[#080808] border-[#1e1e1e] hover:border-white/20'}`}
              >
                <FlowIcon icon={icon} className={`w-4 h-4 ${form.icon === icon ? 'text-black' : 'text-[#71717a]'}`} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-[#71717a] uppercase tracking-widest mb-2">Statut</label>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all
              ${form.is_active ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-[#080808] border-[#1e1e1e] text-[#71717a]'}`}
          >
            {form.is_active ? <CheckIcon className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
            {form.is_active ? 'Actif' : 'Inactif'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-5 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all"
        >
          <BoltIcon className="w-3.5 h-3.5" />
          {loading ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer'}
        </button>
        <button type="button" onClick={cancelForm} className="text-[#71717a] text-xs px-4 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all">
          Annuler
        </button>
      </div>
    </form>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm text-[#71717a]">{flows.length} flow{flows.length > 1 ? 's' : ''}</span>
        <button
          onClick={() => { setShowCreate(!showCreate); setEditingId(null) }}
          className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-all"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Nouveau flow
        </button>
      </div>

      {showCreate && !editingId && formContent}

      <div className="space-y-3">
        {flows.map((flow) => (
          <div key={flow.id}>
            {editingId === flow.id ? formContent : (
              <div className="flex items-center gap-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl px-5 py-4 hover:border-white/10 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <FlowIcon icon={flow.icon} className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{flow.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                      ${flow.is_active ? 'text-green-400 bg-green-500/10' : 'text-[#71717a] bg-white/5'}`}>
                      {flow.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="text-xs text-[#3f3f46] truncate mt-0.5">{flow.webhook_url}</div>
                </div>
                {flow.category && (
                  <span className="text-[10px] text-[#71717a] uppercase tracking-widest hidden md:block">{flow.category}</span>
                )}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(flow)}
                    disabled={isPending}
                    title={flow.is_active ? 'Désactiver' : 'Activer'}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 transition-all"
                  >
                    {flow.is_active ? <XIcon className="w-3.5 h-3.5" /> : <CheckIcon className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => startEdit(flow)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 transition-all"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(flow.id)}
                    disabled={isPending}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

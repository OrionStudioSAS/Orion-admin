'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Profile } from '@/types/database'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  en_cours: { label: 'En cours', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  termine: { label: 'Terminé', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  en_pause: { label: 'En pause', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
}

const PLAN_LABELS: Record<string, string> = {
  webflow_creation: 'Création Webflow',
  shopify_creation: 'Création Shopify',
  webflow_refonte: 'Refonte Webflow',
  shopify_refonte: 'Refonte Shopify',
  automation: 'Automation',
  design: 'Design',
  maintenance: 'Maintenance',
  autre: 'Autre',
}

type EnrichedClient = Profile & {
  project: { id: string; status: string; plan_type: string | null } | null
}

interface Props {
  clients: EnrichedClient[]
}

export default function ClientsPanel({ clients }: Props) {
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (
      (c.company || '').toLowerCase().includes(q) ||
      (c.full_name || '').toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {/* Stats + search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">{clients.length}</div>
            <div className="text-[10px] text-[#a1a1aa] uppercase tracking-widest mt-0.5">Clients</div>
          </div>
          <div className="w-px h-8 bg-[#1e1e1e]" />
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">{clients.filter(c => c.project?.status === 'en_cours').length}</div>
            <div className="text-[10px] text-blue-400 uppercase tracking-widest mt-0.5">En cours</div>
          </div>
          <div className="w-px h-8 bg-[#1e1e1e]" />
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">{clients.filter(c => c.project?.status === 'termine').length}</div>
            <div className="text-[10px] text-green-400 uppercase tracking-widest mt-0.5">Terminés</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par entreprise..."
            className="w-full bg-[#0f0f0f] border border-[#1e1e1e] text-white text-sm rounded-xl pl-9 pr-4 py-2.5 placeholder-[#52525b] focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-12 text-center">
          <p className="text-[#a1a1aa] text-sm">{search ? 'Aucun résultat pour cette recherche.' : 'Aucun client pour le moment.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => {
            const status = client.project?.status ? STATUS_CONFIG[client.project.status] : null
            const initials = (client.company || client.full_name || client.email).slice(0, 2).toUpperCase()

            return (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="group bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl px-4 md:px-6 py-4 hover:border-white/20 transition-all flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-sm font-semibold text-white overflow-hidden">
                  {client.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={client.avatar_url} alt={client.full_name || ''} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-semibold text-white truncate">
                      {client.company || client.full_name || '—'}
                    </span>
                    {status && (
                      <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                    {client.project?.plan_type && (
                      <span className="text-[10px] text-[#a1a1aa] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
                        {PLAN_LABELS[client.project.plan_type] ?? client.project.plan_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {client.full_name && client.company && (
                      <span className="text-xs text-[#a1a1aa]">{client.full_name}</span>
                    )}
                    <span className="text-xs text-[#52525b]">{client.email}</span>
                    {client.phone && (
                      <span className="text-xs text-[#52525b]">{client.phone}</span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-[#52525b] group-hover:text-[#a1a1aa] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

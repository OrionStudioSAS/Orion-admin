'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderIcon, PlusIcon } from '@/components/ui/Icons'

type ProjectRow = {
  id: string
  name: string | null
  status: 'en_cours' | 'termine' | 'en_pause'
  plan_type: string | null
  deadline: string | null
  created_at: string
  updated_at: string
  profiles: {
    id: string
    full_name: string | null
    email: string
    company: string | null
  } | null
  project_steps: Array<{ id: string; status: string }>
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  en_cours: { label: 'En cours', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  termine: { label: 'Terminé', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  en_pause: { label: 'En pause', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
}

const PLAN_LABELS: Record<string, string> = {
  webflow_creation: 'Création Webflow',
  shopify_creation: 'Création Shopify',
  webflow_refonte: 'Refonte Webflow',
  shopify_refonte: 'Refonte Shopify',
  autre: 'Autre',
}

interface Props {
  projects: ProjectRow[]
}

export default function ProjectsPanel({ projects }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (p.name || '').toLowerCase().includes(q)
      || (p.profiles?.full_name || '').toLowerCase().includes(q)
      || (p.profiles?.email || '').toLowerCase().includes(q)
      || (p.profiles?.company || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Projets</h1>
          <p className="text-[#a1a1aa] text-sm mt-1">{projects.length} projet{projects.length !== 1 ? 's' : ''} au total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par projet, client, entreprise..."
            className="w-full bg-[#0f0f0f] border border-[#1e1e1e] text-white text-sm rounded-xl pl-9 pr-4 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-1">
          {[
            { value: 'all', label: 'Tous' },
            { value: 'en_cours', label: 'En cours' },
            { value: 'en_pause', label: 'En pause' },
            { value: 'termine', label: 'Terminés' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all
                ${statusFilter === opt.value ? 'bg-white text-black font-medium' : 'text-[#a1a1aa] hover:text-white'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl px-5 py-16 text-center">
          <FolderIcon className="w-8 h-8 text-[#3f3f46] mx-auto mb-3" />
          <p className="text-[#a1a1aa] text-sm">
            {search || statusFilter !== 'all' ? 'Aucun projet ne correspond à la recherche' : 'Aucun projet créé'}
          </p>
          {!search && statusFilter === 'all' && (
            <p className="text-[#52525b] text-xs mt-1">
              Créez un projet depuis la fiche d&apos;un client.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[#0a0a0a]">
            {filtered.map(project => {
              const steps = project.project_steps || []
              const done = steps.filter(s => s.status === 'done').length
              const total = steps.length
              const pct = total > 0 ? Math.round(done / total * 100) : null
              const status = STATUS_LABELS[project.status]
              const clientName = project.profiles?.full_name || project.profiles?.email || 'Client inconnu'
              const clientSub = project.profiles?.company
                ? project.profiles.company
                : project.profiles?.email || ''

              return (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors group"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                    <FolderIcon className="w-4.5 h-4.5 text-[#a1a1aa]" />
                  </div>

                  {/* Project info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-medium text-white">
                        {project.name || 'Projet sans titre'}
                      </span>
                      {status && (
                        <span className={`text-[9px] font-semibold border px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      )}
                      {project.plan_type && PLAN_LABELS[project.plan_type] && (
                        <span className="text-[9px] text-[#a1a1aa] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                          {PLAN_LABELS[project.plan_type]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-[#52525b]">
                        {clientName}
                        {clientSub && clientSub !== project.profiles?.email && (
                          <span className="text-[#3f3f46]"> · {clientSub}</span>
                        )}
                      </span>
                      {pct !== null && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                            <div className="h-full bg-white/30 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-[#52525b]">{done}/{total}</span>
                        </div>
                      )}
                      {project.deadline && (
                        <span className="text-[10px] text-[#52525b]">
                          Livraison {new Date(project.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date + arrow */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-[10px] text-[#3f3f46]">
                      {new Date(project.updated_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <svg className="w-3.5 h-3.5 text-[#3f3f46] group-hover:text-[#a1a1aa] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick access to create */}
      {projects.length === 0 && (
        <div className="mt-4 text-center">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-xs text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-4 py-2.5 rounded-xl transition-all"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Aller dans Utilisateurs pour créer un projet
          </Link>
        </div>
      )}
    </div>
  )
}

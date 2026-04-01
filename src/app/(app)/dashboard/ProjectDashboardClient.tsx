'use client'

import Link from 'next/link'
import { ArrowRightIcon, ExternalLinkIcon } from '@/components/ui/Icons'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  en_cours: { label: 'En cours', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  termine: { label: 'Terminé', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  en_pause: { label: 'En pause', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
}

const PLAN_LABELS: Record<string, string> = {
  webflow_creation: 'Création Webflow',
  shopify_creation: 'Création Shopify',
  webflow_refonte: 'Refonte Webflow',
  shopify_refonte: 'Refonte Shopify',
  autre: 'Autre',
}

interface Project {
  id: string
  name: string | null
  status: string
  plan_type: string | null
  deadline: string | null
  site_url: string | null
  figma_url: string | null
  staging_url: string | null
  project_steps: { status: string }[]
}

interface Props {
  projects: Project[]
  unreadCount: number
}

export default function ProjectDashboardClient({ projects, unreadCount }: Props) {
  if (projects.length === 0) return null

  const activeProject = projects.find(p => p.status === 'en_cours') || projects[0]

  const steps = activeProject.project_steps || []
  const doneCount = steps.filter(s => s.status === 'done').length
  const donePct = steps.length ? Math.round(doneCount / steps.length * 100) : 0
  const statusInfo = STATUS_LABELS[activeProject.status] || STATUS_LABELS.en_cours

  return (
    <div className="space-y-4">
      {/* Active project card */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        <Link
          href="/project"
          className="group flex items-start justify-between gap-4 p-5 md:p-6 hover:bg-white/2 transition-all"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${statusInfo.color} ${statusInfo.bg}`}>
                {statusInfo.label}
              </span>
              {activeProject.plan_type && (
                <span className="text-[10px] text-[#a1a1aa] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  {PLAN_LABELS[activeProject.plan_type]}
                </span>
              )}
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-white mb-3">{activeProject.name || 'Mon projet'}</h2>

            {steps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#a1a1aa] uppercase tracking-widest">Progression</span>
                  <span className={`text-[10px] font-semibold ${donePct === 100 ? 'text-green-400' : 'text-[#a1a1aa]'}`}>{donePct}%</span>
                </div>
                <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${donePct === 100 ? 'bg-green-400' : 'bg-blue-400'}`}
                    style={{ width: `${donePct}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-[#a1a1aa]">{doneCount}/{steps.length} étapes terminées</span>
                  {activeProject.deadline && (
                    <span className="text-xs text-[#52525b] flex items-center gap-1">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
                      {new Date(activeProject.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <ArrowRightIcon className="w-4 h-4 text-[#a1a1aa] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
        </Link>

        {/* Quick links — outside the Link to avoid nested <a> */}
        {(activeProject.site_url || activeProject.figma_url || activeProject.staging_url) && (
          <div className="flex items-center gap-2 px-5 pb-4 flex-wrap border-t border-[#1e1e1e] pt-3">
            {activeProject.site_url && (
              <a
                href={activeProject.site_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all"
              >
                <ExternalLinkIcon className="w-3 h-3" />
                Site web
              </a>
            )}
            {activeProject.figma_url && (
              <a
                href={activeProject.figma_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all"
              >
                <ExternalLinkIcon className="w-3 h-3" />
                Figma
              </a>
            )}
            {activeProject.staging_url && (
              <a
                href={activeProject.staging_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-orange-400/80 hover:text-orange-300 border border-orange-500/20 hover:border-orange-500/40 px-2.5 py-1.5 rounded-lg transition-all"
              >
                <ExternalLinkIcon className="w-3 h-3" />
                Staging
              </a>
            )}
          </div>
        )}
      </div>

      {/* Other projects */}
      {projects.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.slice(1).map(p => {
            const pSteps = p.project_steps || []
            const pDoneCount = pSteps.filter(s => s.status === 'done').length
            const pDonePct = pSteps.length ? Math.round(pDoneCount / pSteps.length * 100) : 0
            const pStatusInfo = STATUS_LABELS[p.status] || STATUS_LABELS.en_cours
            return (
              <Link
                key={p.id}
                href="/project"
                className="group flex flex-col bg-[#0f0f0f] border border-[#1e1e1e] hover:border-white/20 rounded-2xl p-4 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${pStatusInfo.color} ${pStatusInfo.bg}`}>
                    {pStatusInfo.label}
                  </span>
                  <ArrowRightIcon className="w-3 h-3 text-[#3f3f46] group-hover:text-white transition-colors" />
                </div>
                <div className="text-sm font-medium text-white mb-2">{p.name || 'Projet'}</div>
                {pSteps.length > 0 && (
                  <div className="mt-auto">
                    <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pDonePct === 100 ? 'bg-green-400' : 'bg-blue-400'}`} style={{ width: `${pDonePct}%` }} />
                    </div>
                    <div className="text-[10px] text-[#52525b] mt-1">{pDoneCount}/{pSteps.length} étapes</div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

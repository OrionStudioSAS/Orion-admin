import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Flow } from '@/types/database'
import { FlowIcon, ArrowRightIcon, StarIcon, LockIcon, FolderIcon, ExternalLinkIcon } from '@/components/ui/Icons'
import RequestAccessButton from '@/components/ui/RequestAccessButton'

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

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = profile?.full_name?.split(' ')[0] || 'toi'

  // ── CLIENT DASHBOARD ──────────────────────────────────────────────────────
  if (!isAdmin) {
    const { data: projectsData } = await admin
      .from('projects')
      .select('*, project_steps(*)')
      .eq('profile_id', user.id)
      .order('updated_at', { ascending: false })

    const projects = projectsData || []
    const activeProject = projects.find(p => p.status === 'en_cours') || projects[0] || null

    // Unread step messages
    let unreadCount = 0
    if (activeProject) {
      const { count } = await admin
        .from('step_messages')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', activeProject.id)
        .eq('is_admin_sender', true)
        .eq('is_read', false)
      unreadCount = count || 0
    }

    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
            <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Tableau de bord</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">{greeting}, {firstName}</h1>
          <p className="text-[#a1a1aa] text-sm mt-2">
            {projects.length === 0
              ? "Votre espace projet est en cours de configuration."
              : `${projects.length} projet${projects.length > 1 ? 's' : ''} · Bienvenue sur votre espace Orion Studio`}
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-8 md:p-16 text-center">
            <FolderIcon className="w-8 h-8 text-[#52525b] mx-auto mb-3" />
            <p className="text-[#a1a1aa] text-sm">Votre projet est en cours de configuration.</p>
            <p className="text-[#52525b] text-xs mt-1">Votre espace sera disponible très prochainement.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active project card */}
            {activeProject && (() => {
              const steps = activeProject.project_steps || []
              const doneCount = steps.filter((s: { status: string }) => s.status === 'done').length
              const donePct = steps.length ? Math.round(doneCount / steps.length * 100) : 0
              const statusInfo = STATUS_LABELS[activeProject.status] || STATUS_LABELS.en_cours

              return (
                <Link
                  href="/project"
                  className="group block bg-[#0f0f0f] border border-[#1e1e1e] hover:border-white/20 rounded-2xl p-5 md:p-6 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
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
                      <h2 className="text-lg font-semibold text-white">
                        {activeProject.name || 'Mon projet'}
                      </h2>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-[#a1a1aa] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>

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

                  {/* Quick links */}
                  {(activeProject.site_url || activeProject.figma_url || activeProject.staging_url) && (
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      {activeProject.site_url && (
                        <a
                          href={activeProject.site_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
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
                          onClick={e => e.stopPropagation()}
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
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-[10px] text-orange-400/80 hover:text-orange-300 border border-orange-500/20 hover:border-orange-500/40 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          <ExternalLinkIcon className="w-3 h-3" />
                          Staging
                        </a>
                      )}
                    </div>
                  )}
                </Link>
              )
            })()}

            {/* Other projects (if more than 1) */}
            {projects.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.slice(1).map(p => {
                  const steps = p.project_steps || []
                  const doneCount = steps.filter((s: { status: string }) => s.status === 'done').length
                  const donePct = steps.length ? Math.round(doneCount / steps.length * 100) : 0
                  const statusInfo = STATUS_LABELS[p.status] || STATUS_LABELS.en_cours
                  return (
                    <Link
                      key={p.id}
                      href="/project"
                      className="group flex flex-col bg-[#0f0f0f] border border-[#1e1e1e] hover:border-white/20 rounded-2xl p-4 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${statusInfo.color} ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                        <ArrowRightIcon className="w-3 h-3 text-[#3f3f46] group-hover:text-white transition-colors" />
                      </div>
                      <div className="text-sm font-medium text-white mb-2">{p.name || 'Projet'}</div>
                      {steps.length > 0 && (
                        <div className="mt-auto">
                          <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${donePct === 100 ? 'bg-green-400' : 'bg-blue-400'}`} style={{ width: `${donePct}%` }} />
                          </div>
                          <div className="text-[10px] text-[#52525b] mt-1">{doneCount}/{steps.length} étapes</div>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── ADMIN DASHBOARD ───────────────────────────────────────────────────────
  const { data: allFlows } = await admin.from('flows').select('*').eq('is_active', true).order('created_at')
  const flows: Flow[] = allFlows || []

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Automatisations</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">{greeting}, {firstName}</h1>
        <p className="text-[#a1a1aa] text-sm mt-2">
          {flows.length === 0
            ? "Aucune automatisation disponible pour le moment."
            : `${flows.length} automatisation${flows.length > 1 ? 's' : ''} active${flows.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {flows.length === 0 ? (
        <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-8 md:p-16 text-center">
          <p className="text-[#a1a1aa] text-sm">Aucune automatisation disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {flows.map((flow) => <FlowCard key={flow.id} flow={flow} />)}
        </div>
      )}
    </div>
  )
}

function FlowCard({ flow }: { flow: Flow }) {
  return (
    <Link
      href={`/flows/${flow.id}`}
      className="group relative flex flex-col bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 md:p-6 hover:border-white/20 hover:bg-[#141414] transition-all duration-200"
    >
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 md:mb-5 group-hover:bg-white/10 transition-colors">
        <FlowIcon icon={flow.icon} className="w-4 h-4 text-white" />
      </div>
      {flow.category && (
        <span className="text-[10px] text-[#a1a1aa] uppercase tracking-widest font-medium mb-2">{flow.category}</span>
      )}
      <h3 className="text-sm font-semibold text-white mb-2">{flow.name}</h3>
      {flow.description && (
        <p className="text-[#a1a1aa] text-xs leading-relaxed mb-4 md:mb-5 flex-1">{flow.description}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-[#a1a1aa] group-hover:text-white transition-colors mt-auto">
        <span>Lancer l&apos;automatisation</span>
        <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#1e1e1e] group-hover:bg-white/30 transition-colors" />
    </Link>
  )
}

function LockedFlowCard({ flow, alreadyRequested }: { flow: Flow; alreadyRequested: boolean }) {
  return (
    <div className="relative flex flex-col bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 md:p-6 opacity-60">
      <div className="w-10 h-10 rounded-xl bg-white/3 border border-white/5 flex items-center justify-center mb-4 md:mb-5">
        <FlowIcon icon={flow.icon} className="w-4 h-4 text-[#a1a1aa]" />
      </div>
      {flow.category && (
        <span className="text-[10px] text-[#52525b] uppercase tracking-widest font-medium mb-2">{flow.category}</span>
      )}
      <h3 className="text-sm font-semibold text-[#a1a1aa] mb-2">{flow.name}</h3>
      {flow.description && (
        <p className="text-[#a1a1aa] text-xs leading-relaxed mb-4 md:mb-5 flex-1">{flow.description}</p>
      )}
      <div className="mt-auto">
        <RequestAccessButton flowId={flow.id} alreadyRequested={alreadyRequested} />
      </div>
      <div className="absolute top-4 right-4">
        <LockIcon className="w-3.5 h-3.5 text-[#52525b]" />
      </div>
    </div>
  )
}


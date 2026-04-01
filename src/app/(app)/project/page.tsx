import { redirect } from 'next/navigation'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon, ExternalLinkIcon, FolderIcon, LinkedInIcon } from '@/components/ui/Icons'
import DownloadButton from './DownloadButton'
import OpenLinkButton from './OpenLinkButton'
import ClientStepRow from './ClientStepRow'
import { StepMessage } from '@/types/database'

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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  en_cours: { label: 'En cours', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  termine: { label: 'Terminé', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  en_pause: { label: 'En pause', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
}


function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function ProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role === 'admin') redirect('/admin/users')

  const { data: projectsData } = await admin
    .from('projects')
    .select('*, project_files(*)')
    .eq('profile_id', user.id)
    .order('updated_at', { ascending: false })

  const project = projectsData?.[0] ?? null

  const steps = project
    ? (await admin.from('project_steps').select('*').eq('project_id', project.id).order('position', { ascending: true })).data || []
    : []

  const stepMessagesMap: Record<string, StepMessage[]> = {}
  if (project && steps.length > 0) {
    const { data: msgs } = await admin.from('step_messages').select('*').eq('project_id', project.id).order('created_at', { ascending: true })
    for (const msg of (msgs || []) as StepMessage[]) {
      if (!stepMessagesMap[msg.step_id]) stepMessagesMap[msg.step_id] = []
      stepMessagesMap[msg.step_id].push(msg)
    }
  }

  // Team members and apps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teamMembers: any[] = project
    ? (await admin.from('project_team_members').select('*, profile:profiles(*)').eq('project_id', project.id)).data || []
    : []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectApps: any[] = project
    ? (await admin.from('project_apps').select('*, app:apps(*)').eq('project_id', project.id)).data || []
    : []

  const files = ((project?.project_files || []) as Array<{
    id: string; name: string; category: string; type: string; storage_path: string | null; url: string | null; original_name: string | null; size_bytes: number | null; visible_to_client: boolean; created_at: string
  }>).filter(f => f.visible_to_client !== false)

  const resources = files.filter(f => f.category === 'resource')
  const quotes = files.filter(f => f.category === 'quote')
  const invoices = files.filter(f => f.category === 'invoice')

  const status = project?.status ? STATUS_LABELS[project.status] : null

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Espace client</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Mon projet</h1>
          {status && (
            <span className={`text-[10px] font-semibold border px-2.5 py-1 rounded-full ${status.color}`}>
              {status.label}
            </span>
          )}
          {project?.plan_type && (
            <span className="text-[10px] text-[#a1a1aa] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
              {PLAN_LABELS[project.plan_type]}
            </span>
          )}
          {project?.deadline && (
            <span className="text-[10px] text-[#a1a1aa] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Livraison : {new Date(project.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Review banner when project is done */}
      {project?.status === 'termine' && (
        <div className="mb-6 flex items-start gap-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-5">
          <div className="text-2xl shrink-0">⭐</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-yellow-200 mb-1">Votre projet est terminé — laissez-nous un avis !</div>
            <p className="text-xs text-yellow-400/70 leading-relaxed mb-3">
              Votre retour nous aide à nous améliorer et à aider d&apos;autres entreprises à nous trouver. Cela prend moins de 30 secondes !
            </p>
            <a
              href={process.env.NEXT_PUBLIC_REVIEW_URL || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Laisser un avis Google
            </a>
          </div>
        </div>
      )}

      {!project ? (
        <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-8 md:p-16 text-center">
          <FolderIcon className="w-8 h-8 text-[#52525b] mx-auto mb-3" />
          <p className="text-[#a1a1aa] text-sm">Votre projet est en cours de configuration.</p>
          <p className="text-[#52525b] text-xs mt-1">Votre espace sera disponible très prochainement.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Liens rapides */}
          {(project.figma_url || project.site_url || project.staging_url) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.figma_url && (
                <a
                  href={project.figma_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 hover:border-white/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm-8-4a4 4 0 1 0 8 0V4H4a4 4 0 0 0 0 8zm0 4a4 4 0 0 0 4 4h4v-4a4 4 0 0 0-4-4 4 4 0 0 0-4 4zm4 8a4 4 0 1 0 0-8v8z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#a1a1aa] uppercase tracking-widest mb-1">Maquette</div>
                    <div className="text-sm font-medium text-white">Voir sur Figma</div>
                  </div>
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-white transition-colors shrink-0" />
                </a>
              )}
              {project.site_url && (
                <a
                  href={project.site_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 hover:border-white/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3c-2.5 3-4 5.7-4 9s1.5 6 4 9m0-18c2.5 3 4 5.7 4 9s-1.5 6-4 9M3 12h18" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#a1a1aa] uppercase tracking-widest mb-1">Site web</div>
                    <div className="text-sm font-medium text-white truncate">{project.site_url.replace(/^https?:\/\//, '')}</div>
                  </div>
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-white transition-colors shrink-0" />
                </a>
              )}
              {project.staging_url && (
                <a
                  href={project.staging_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 hover:border-white/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:bg-orange-500/20 transition-colors">
                    <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M10 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6" strokeLinecap="round"/>
                      <path d="M8 12h.01M12 12h.01" strokeLinecap="round" strokeWidth="2"/>
                      <path d="M16 18l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-orange-400/80 uppercase tracking-widest mb-1">Staging / Prévisualisation</div>
                    <div className="text-sm font-medium text-white truncate">{project.staging_url.replace(/^https?:\/\//, '')}</div>
                  </div>
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-white transition-colors shrink-0" />
                </a>
              )}
            </div>
          )}

          {/* Google Business warning if missing */}
          {!project.google_business_url && (
            <div className="flex items-start gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinejoin="round"/>
                  <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/>
                  <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeWidth="2"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-yellow-300 mb-1">Fiche Google Business manquante</div>
                <p className="text-xs text-yellow-400/70 leading-relaxed">
                  Votre fiche Google Business n&apos;est pas encore configurée. Une fiche optimisée améliore votre référencement local et votre visibilité sur Google Maps. Contactez-nous pour l&apos;activer.
                </p>
              </div>
            </div>
          )}
          {project.google_business_url && (
            <a
              href={project.google_business_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 hover:border-white/20 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#4285F4"/>
                  <path d="M17.6 12.2c0-.4 0-.8-.1-1.2H12v2.3h3.1c-.1.8-.6 1.5-1.3 1.9v1.6h2.1c1.2-1.1 1.9-2.8 1.7-4.6z" fill="#4285F4"/>
                  <path d="M12 18c1.6 0 3-.5 4-1.4l-2.1-1.6c-.6.4-1.2.6-1.9.6-1.5 0-2.7-1-3.1-2.4H6.7v1.7C7.7 16.8 9.7 18 12 18z" fill="#34A853"/>
                  <path d="M8.9 13.2c-.1-.4-.2-.8-.2-1.2s.1-.8.2-1.2V9.1H6.7C6.3 9.9 6 10.9 6 12s.3 2.1.7 2.9l2.2-1.7z" fill="#FBBC05"/>
                  <path d="M12 8.4c.8 0 1.6.3 2.2.9l1.7-1.7C14.8 6.6 13.5 6 12 6 9.7 6 7.7 7.2 6.7 9.1l2.2 1.7C9.3 9.4 10.5 8.4 12 8.4z" fill="#EA4335"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#a1a1aa] uppercase tracking-widest mb-1">Fiche Google</div>
                <div className="text-sm font-medium text-white">Voir ma fiche Google</div>
              </div>
              <ExternalLinkIcon className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-white transition-colors shrink-0" />
            </a>
          )}

          {/* Notes de l'équipe */}
          {project.notes && (
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5">
              <div className="text-[10px] text-[#a1a1aa] uppercase tracking-widest font-medium mb-3">Note de l'équipe</div>
              <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}

          {/* Équipe du projet */}
          {teamMembers.length > 0 && (
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5">
              <div className="text-[10px] text-[#a1a1aa] uppercase tracking-widest font-medium mb-4">Équipe du projet</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teamMembers.map((m: { id: string; role_override: string | null; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null; job_title: string | null; linkedin_url: string | null; phone: string | null } }) => (
                  <div key={m.id} className="flex gap-3 bg-white/3 border border-white/8 rounded-xl p-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                      {m.profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.profile.avatar_url} alt={m.profile.full_name || ''} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-white uppercase">{(m.profile.full_name || m.profile.email)[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{m.profile.full_name || m.profile.email}</div>
                      {m.profile.job_title && (
                        <div className="text-[10px] text-[#a1a1aa] mt-0.5">{m.profile.job_title}</div>
                      )}
                      {m.role_override && (
                        <div className="text-[10px] text-blue-400 mt-0.5">{m.role_override}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {m.profile.email && (
                          <a href={`mailto:${m.profile.email}`} className="text-[10px] text-[#52525b] hover:text-white transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {m.profile.email}
                          </a>
                        )}
                        {m.profile.phone && (
                          <a href={`tel:${m.profile.phone}`} className="text-[10px] text-[#52525b] hover:text-white transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round"/></svg>
                            {m.profile.phone}
                          </a>
                        )}
                        {m.profile.linkedin_url && (
                          <a href={m.profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#52525b] hover:text-blue-400 transition-colors flex items-center gap-1">
                            <LinkedInIcon className="w-3 h-3" />
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apps & APIs */}
          {projectApps.length > 0 && (
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5">
              <div className="text-[10px] text-[#a1a1aa] uppercase tracking-widest font-medium mb-4">Apps</div>
              <div className="flex flex-wrap gap-2">
                {projectApps.map((pa: { id: string; app: { id: string; name: string; logo_url: string | null; description: string | null } }) => (
                  <div key={pa.id} className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-xl px-3 py-2">
                    {pa.app.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pa.app.logo_url} alt={pa.app.name} className="w-5 h-5 object-contain rounded" />
                    ) : (
                      <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white">{pa.app.name[0]}</span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-white">{pa.app.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Étapes du projet */}
          {steps.length > 0 && (() => {
            const donePct = Math.round(steps.filter(s => s.status === 'done').length / steps.length * 100)
            return (
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1e1e1e]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-white">Avancement du projet</div>
                    <span className="text-[10px] text-[#a1a1aa]">{steps.filter(s => s.status === 'done').length} / {steps.length} étapes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${donePct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-white shrink-0">{donePct}%</span>
                  </div>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {steps.map((step, idx) => {
                    const isDone = step.status === 'done'
                    const isInProgress = step.status === 'in_progress'
                    const msgs = stepMessagesMap[step.id] ?? []
                    const unread = msgs.filter(m => m.is_admin_sender && !m.is_read).length
                    return (
                      <ClientStepRow
                        key={step.id}
                        idx={idx}
                        step={step}
                        isDone={isDone}
                        isInProgress={isInProgress}
                        msgs={msgs}
                        unread={unread}
                        profileId={user.id}
                        projectId={project.id}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Sections fichiers */}
          {[
            { key: 'resource', label: 'Ressources', files: resources, desc: 'Plans d\'action, audits, rapports' },
            { key: 'quote', label: 'Devis', files: quotes, desc: 'Devis de prestation' },
            { key: 'invoice', label: 'Factures', files: invoices, desc: 'Factures et reçus' },
          ].map(({ label, files: sectionFiles, desc }) => (
            <div key={label} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{label}</div>
                  <div className="text-xs text-[#a1a1aa] mt-0.5">{desc}</div>
                </div>
                <span className="text-[10px] text-[#a1a1aa]">{sectionFiles.length} fichier{sectionFiles.length > 1 ? 's' : ''}</span>
              </div>
              {sectionFiles.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-[#52525b] text-xs">Aucun fichier disponible pour le moment.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#0f0f0f]">
                  {sectionFiles.map(file => (
                    <div key={file.id} className="flex items-center gap-3 md:gap-4 px-5 py-3.5 bg-[#080808]/50">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0
                        ${file.type === 'link' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
                        {file.type === 'link' ? (
                          <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-[#a1a1aa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
                            <polyline points="14 2 14 8 20 8" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{file.name}</div>
                        <div className="text-[11px] text-[#a1a1aa] mt-0.5">
                          {file.original_name && <span>{file.original_name}</span>}
                          {file.size_bytes && <span className="ml-2">{formatBytes(file.size_bytes)}</span>}
                        </div>
                      </div>
                      <div className="text-[10px] text-[#a1a1aa] shrink-0 hidden sm:block">
                        {new Date(file.created_at).toLocaleDateString('fr-FR')}
                      </div>
                      {file.type === 'link' && file.url
                        ? <OpenLinkButton url={file.url} />
                        : file.storage_path && <DownloadButton storagePath={file.storage_path} fileName={file.original_name || file.name} />
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* iClosed booking widget */}
      <div className="mt-6 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e1e]">
          <div className="text-sm font-semibold text-white">Réserver un call</div>
          <div className="text-xs text-[#a1a1aa] mt-0.5">Discutez de votre projet avec notre équipe</div>
        </div>
        <div className="p-0">
          <div
            className="iclosed-widget"
            data-url="https://app.iclosed.io/e/orion-studio/reservez-un-call-1-to-1"
            data-width="100%"
            data-height="600"
          />
          <Script src="https://app.iclosed.io/assets/widget.js" strategy="lazyOnload" />
        </div>
      </div>
    </div>
  )
}

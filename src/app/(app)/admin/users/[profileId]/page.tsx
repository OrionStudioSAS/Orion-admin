import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon, FolderIcon } from '@/components/ui/Icons'
import CreateProjectButton from './CreateProjectButton'

interface Props {
  params: Promise<{ profileId: string }>
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

export default async function AdminUserProjectPage({ params }: Props) {
  const { profileId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: meProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (meProfile?.role !== 'admin') redirect('/dashboard')

  const { data: targetProfile } = await admin.from('profiles').select('*').eq('id', profileId).single()
  if (!targetProfile) notFound()

  const { data: projects } = await admin
    .from('projects')
    .select('*, project_steps(id, status)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  const projectList = projects || []

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#a1a1aa] mb-6">
        <Link href="/admin/users" className="hover:text-white transition-colors">Utilisateurs</Link>
        <span>/</span>
        <span className="text-white">{targetProfile.full_name || targetProfile.email}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Administration</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white">
              {targetProfile.full_name || targetProfile.email}
            </h1>
            <p className="text-[#a1a1aa] text-sm mt-1">
              {targetProfile.email}
              {targetProfile.company && <span className="ml-2 text-[#a1a1aa]">· {targetProfile.company}</span>}
            </p>
          </div>
          <Link
            href="/admin/users"
            className="text-xs text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-4 py-2 rounded-lg transition-all"
          >
            ← Retour
          </Link>
        </div>
      </div>

      {/* Projects section */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <div>
            <div className="text-sm font-semibold text-white">Projets</div>
            <div className="text-xs text-[#a1a1aa] mt-0.5">
              {projectList.length === 0
                ? 'Aucun projet pour ce client'
                : `${projectList.length} projet${projectList.length > 1 ? 's' : ''}`}
            </div>
          </div>
          <CreateProjectButton profileId={profileId} />
        </div>

        {projectList.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FolderIcon className="w-8 h-8 text-[#3f3f46] mx-auto mb-3" />
            <p className="text-[#a1a1aa] text-sm">Aucun projet configuré</p>
            <p className="text-[#52525b] text-xs mt-1">Créez un projet pour commencer à gérer l&apos;espace client.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#0a0a0a]">
            {projectList.map(project => {
              const steps = (project.project_steps as Array<{ id: string; status: string }>) || []
              const done = steps.filter(s => s.status === 'done').length
              const total = steps.length
              const pct = total > 0 ? Math.round(done / total * 100) : null
              const status = project.status ? STATUS_LABELS[project.status] : null

              return (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="flex items-center gap-4 px-5 py-4 bg-[#080808]/30 hover:bg-white/3 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                    <FolderIcon className="w-4 h-4 text-[#a1a1aa]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">
                        {project.name || 'Projet sans titre'}
                      </span>
                      {status && (
                        <span className={`text-[9px] font-semibold border px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      )}
                      {project.plan_type && (
                        <span className="text-[9px] text-[#a1a1aa] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                          {PLAN_LABELS[project.plan_type]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {pct !== null && (
                        <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                          <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                            <div className="h-full bg-white/40 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-[#52525b] shrink-0">{done}/{total}</span>
                        </div>
                      )}
                      {project.deadline && (
                        <span className="text-[10px] text-[#52525b]">
                          Livraison : {new Date(project.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      <span className="text-[10px] text-[#3f3f46]">
                        {new Date(project.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  <svg className="w-3.5 h-3.5 text-[#3f3f46] group-hover:text-[#a1a1aa] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

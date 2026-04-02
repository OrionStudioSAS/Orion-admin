import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isWhatsAppConfigured } from '@/lib/whatsapp'
import { StepMessage } from '@/types/database'
import ProjectManager from '../../users/[profileId]/ProjectManager'
import StepsManager from '../../users/[profileId]/StepsManager'
import TeamSection from './TeamSection'
import AppsSection from './AppsSection'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  en_cours: { label: 'En cours', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  termine: { label: 'Terminé', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  en_pause: { label: 'En pause', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
}

interface Props {
  params: Promise<{ projectId: string }>
}

export default async function AdminProjectEditPage({ params }: Props) {
  const { projectId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: project } = await admin.from('projects').select('*').eq('id', projectId).single()
  if (!project) notFound()

  const profileId = project.profile_id

  const [profileRes, filesRes, stepsRes, msgsRes, adminsRes, allUsersRes, teamRes, allAppsRes, projectAppsRes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', profileId).single(),
    admin.from('project_files').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    admin.from('project_steps').select('*').eq('project_id', projectId).order('position', { ascending: true }),
    admin.from('step_messages').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
    admin.from('profiles').select('*').eq('role', 'admin').order('full_name'),
    admin.from('profiles').select('*').order('full_name'),
    admin.from('project_team_members').select('*, profile:profiles(*)').eq('project_id', projectId),
    admin.from('apps').select('*').order('name'),
    admin.from('project_apps').select('app_id').eq('project_id', projectId),
  ])

  const targetProfile = profileRes.data
  const files = filesRes.data || []
  const steps = stepsRes.data || []

  const stepMessagesMap: Record<string, StepMessage[]> = {}
  for (const msg of (msgsRes.data || []) as StepMessage[]) {
    if (!stepMessagesMap[msg.step_id]) stepMessagesMap[msg.step_id] = []
    stepMessagesMap[msg.step_id].push(msg)
  }

  const whatsappConfigured = isWhatsAppConfigured()
  const hasPhone = !!targetProfile?.phone
  const status = project.status ? STATUS_LABELS[project.status] : null

  const allAdmins = adminsRes.data || []
  const allUsers = allUsersRes.data || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teamMembers = (teamRes.data || []).map((m: any) => ({ ...m, profile: m.profile as any }))
  const allApps = allAppsRes.data || []
  const projectAppIds = (projectAppsRes.data || []).map(r => r.app_id)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#a1a1aa] mb-6">
        <Link href="/admin/projects" className="hover:text-white transition-colors">Projets</Link>
        <span>/</span>
        {targetProfile && (
          <>
            <Link href={`/admin/users/${profileId}`} className="hover:text-white transition-colors">
              {targetProfile.full_name || targetProfile.email}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-white">{project.name || 'Projet sans titre'}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-2xl md:text-3xl font-semibold text-white">
                {project.name || 'Projet sans titre'}
              </h1>
              {status && (
                <span className={`text-[10px] font-semibold border px-2.5 py-1 rounded-full ${status.color}`}>
                  {status.label}
                </span>
              )}
            </div>
            {targetProfile && (
              <p className="text-[#a1a1aa] text-sm">
                {targetProfile.full_name || targetProfile.email}
                {targetProfile.company && <span className="text-[#52525b]"> · {targetProfile.company}</span>}
              </p>
            )}
          </div>
          <Link
            href="/admin/projects"
            className="text-xs text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-4 py-2 rounded-lg transition-all shrink-0"
          >
            ← Projets
          </Link>
        </div>
      </div>

      {/* Étapes */}
      <div className="mb-5">
        <StepsManager
          projectId={projectId}
          profileId={profileId}
          steps={steps}
          stepMessages={stepMessagesMap}
        />
      </div>

      {/* Team section */}
      <div className="mb-5">
        <TeamSection
          projectId={projectId}
          profileId={profileId}
          admins={allAdmins}
          allUsers={allUsers}
          teamMembers={teamMembers}
        />
      </div>

      {/* Apps section */}
      <div className="mb-5">
        <AppsSection
          projectId={projectId}
          profileId={profileId}
          allApps={allApps}
          projectAppIds={projectAppIds}
        />
      </div>

      {/* Paramètres + fichiers */}
      <ProjectManager
        projectId={projectId}
        profileId={profileId}
        project={project}
        files={files}
        whatsappConfigured={whatsappConfigured}
        hasPhone={hasPhone}
      />
    </div>
  )
}

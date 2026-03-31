import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon } from '@/components/ui/Icons'
import ProjectManager from './ProjectManager'
import StepsManager from './StepsManager'
import { Project, ProjectFile, ProjectStep, StepMessage } from '@/types/database'
import { isWhatsAppConfigured } from '@/lib/whatsapp'

interface Props {
  params: Promise<{ profileId: string }>
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

  const { data: project } = await admin.from('projects').select('*').eq('profile_id', profileId).single()

  let files: ProjectFile[] = []
  let steps: ProjectStep[] = []
  let stepMessagesMap: Record<string, StepMessage[]> = {}
  if (project) {
    const [filesRes, stepsRes, msgsRes] = await Promise.all([
      admin.from('project_files').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
      admin.from('project_steps').select('*').eq('project_id', project.id).order('position', { ascending: true }),
      admin.from('step_messages').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
    ])
    files = filesRes.data || []
    steps = stepsRes.data || []
    for (const msg of (msgsRes.data || []) as StepMessage[]) {
      if (!stepMessagesMap[msg.step_id]) stepMessagesMap[msg.step_id] = []
      stepMessagesMap[msg.step_id].push(msg)
    }
  }

  const whatsappConfigured = isWhatsAppConfigured()
  const hasPhone = !!targetProfile.phone

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#a1a1aa] mb-6">
        <Link href="/admin/users" className="hover:text-white transition-colors">Utilisateurs</Link>
        <span>/</span>
        <span className="text-[#a1a1aa]">{targetProfile.full_name || targetProfile.email}</span>
        <span>/</span>
        <span className="text-white">Projet</span>
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

      <div className="space-y-5">
        <ProjectManager
          profileId={profileId}
          project={project as Project | null}
          files={files}
          whatsappConfigured={whatsappConfigured}
          hasPhone={hasPhone}
        />
        {project && (
          <StepsManager
            projectId={project.id}
            profileId={profileId}
            steps={steps}
            stepMessages={stepMessagesMap}
          />
        )}
      </div>
    </div>
  )
}

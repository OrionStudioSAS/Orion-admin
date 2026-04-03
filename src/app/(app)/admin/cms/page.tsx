import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon } from '@/components/ui/Icons'
import { getSites } from '@/app/actions/cms'
import CmsPanel from './CmsPanel'

export default async function CmsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [sites, projectsRes] = await Promise.all([
    getSites(),
    admin.from('projects').select('id, name, profiles(full_name)').order('name'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = (projectsRes.data || []).map((p: any) => ({
    id: p.id,
    name: p.name || 'Sans nom',
    clientName: p.profiles?.full_name || null,
  }))

  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem)] lg:h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-5 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Administration</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">CMS</h1>
        <p className="text-[#a1a1aa] text-sm mt-1">Modifier le contenu des sites clients</p>
      </div>

      <div className="flex-1 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden flex flex-col min-h-0">
        <CmsPanel initialSites={sites} projects={projects} />
      </div>
    </div>
  )
}

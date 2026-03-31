import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ProjectsPanel from './ProjectsPanel'

export default async function AdminProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: projects } = await admin
    .from('projects')
    .select('*, profiles(id, full_name, email, company), project_steps(id, status)')
    .order('updated_at', { ascending: false })

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <ProjectsPanel projects={(projects as Parameters<typeof ProjectsPanel>[0]['projects']) || []} />
    </div>
  )
}

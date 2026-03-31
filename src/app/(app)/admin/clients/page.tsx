import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon } from '@/components/ui/Icons'
import ClientsPanel from './ClientsPanel'

export default async function AdminClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const [{ data: clients }, { data: projects }] = await Promise.all([
    admin.from('profiles').select('*').eq('role', 'client').order('company', { ascending: true }),
    admin.from('projects').select('id, profile_id, status, plan_type'),
  ])

  const projectByProfile = Object.fromEntries(
    (projects || []).map(p => [p.profile_id, p])
  )

  const enriched = (clients || []).map(c => ({
    ...c,
    project: projectByProfile[c.id] ?? null,
  }))

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Administration</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Clients</h1>
        <p className="text-[#a1a1aa] text-sm mt-2">Gérez vos clients et accédez à leur espace projet</p>
      </div>

      <ClientsPanel clients={enriched} />
    </div>
  )
}

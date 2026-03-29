import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon } from '@/components/ui/Icons'
import UsersTable from './UsersTable'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: profiles }, { data: flows }, { data: allAccess }] = await Promise.all([
    admin.from('profiles').select('*').order('created_at', { ascending: false }),
    admin.from('flows').select('id, name').eq('is_active', true),
    admin.from('flow_access').select('*'),
  ])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#3f3f46]" />
          <span className="text-[#3f3f46] text-xs tracking-widest uppercase font-medium">Administration</span>
        </div>
        <h1 className="text-3xl font-semibold text-white">Utilisateurs</h1>
        <p className="text-[#71717a] text-sm mt-2">Gérez les accès et les rôles</p>
      </div>

      <UsersTable
        profiles={profiles || []}
        flows={flows || []}
        accessList={allAccess || []}
        currentUserId={user.id}
      />
    </div>
  )
}

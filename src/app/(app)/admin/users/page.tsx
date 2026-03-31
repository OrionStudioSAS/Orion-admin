import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon } from '@/components/ui/Icons'
import UsersTable from './UsersTable'
import AccessRequestsPanel from './AccessRequestsPanel'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: profiles }, { data: flows }, { data: allAccess }, { data: requests }] = await Promise.all([
    admin.from('profiles').select('*').order('created_at', { ascending: false }),
    admin.from('flows').select('id, name').eq('is_active', true),
    admin.from('flow_access').select('*'),
    admin.from('access_requests').select('*, profiles(full_name, email), flows(name)').eq('status', 'pending').order('created_at', { ascending: false }),
  ])

  const pendingCount = requests?.length || 0

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Administration</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Utilisateurs</h1>
        <p className="text-[#a1a1aa] text-sm mt-2">Gérez les accès et les rôles</p>
      </div>

      {pendingCount > 0 && (
        <div className="mb-8">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <AccessRequestsPanel requests={requests as any[]} />
        </div>
      )}

      <UsersTable profiles={profiles || []} flows={flows || []} accessList={allAccess || []} currentUserId={user.id} />
    </div>
  )
}

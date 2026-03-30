import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/layout/Sidebar'
import { Profile } from '@/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin'

  // Badges en parallèle
  const [pendingRequestsResult, unreadMessagesResult] = await Promise.all([
    isAdmin
      ? admin.from('access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      : Promise.resolve({ count: 0 }),
    isAdmin
      // Admin: messages non lus des membres
      ? admin.from('support_messages').select('*', { count: 'exact', head: true }).eq('is_admin_sender', false).eq('is_read', false)
      // Member: messages non lus de l'admin
      : admin.from('support_messages').select('*', { count: 'exact', head: true }).eq('profile_id', user.id).eq('is_admin_sender', true).eq('is_read', false),
  ])

  const pendingRequestsCount = (pendingRequestsResult as { count: number | null }).count || 0
  const unreadMessagesCount = (unreadMessagesResult as { count: number | null }).count || 0

  return (
    <div className="flex min-h-screen">
      <Sidebar
        profile={profile as Profile}
        pendingRequestsCount={pendingRequestsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
      {/* Desktop: ml-60 | Mobile: mt-14 (top bar height) */}
      <main className="flex-1 lg:ml-60 mt-14 lg:mt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}

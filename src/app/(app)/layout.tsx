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

  // Badge demandes en attente (admins seulement)
  let pendingRequestsCount = 0
  if (profile.role === 'admin') {
    const { count } = await admin
      .from('access_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingRequestsCount = count || 0
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile as Profile} pendingRequestsCount={pendingRequestsCount} />
      {/* Desktop: ml-60 | Mobile: mt-14 (top bar height) */}
      <main className="flex-1 lg:ml-60 mt-14 lg:mt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}

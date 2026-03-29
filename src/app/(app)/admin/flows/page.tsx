import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon } from '@/components/ui/Icons'
import FlowsManager from './FlowsManager'

export default async function AdminFlowsPage() {
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

  const { data: flows } = await admin
    .from('flows')
    .select('*')
    .order('created_at')

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#3f3f46]" />
          <span className="text-[#3f3f46] text-xs tracking-widest uppercase font-medium">Administration</span>
        </div>
        <h1 className="text-3xl font-semibold text-white">Flows N8N</h1>
        <p className="text-[#71717a] text-sm mt-2">Gérez vos workflows et leurs webhooks</p>
      </div>

      <FlowsManager flows={flows || []} />
    </div>
  )
}

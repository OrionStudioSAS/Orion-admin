import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Flow } from '@/types/database'
import { FlowIcon, ArrowRightIcon, StarIcon } from '@/components/ui/Icons'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  let flows: Flow[] = []

  if (profile?.role === 'admin') {
    const { data } = await admin
      .from('flows')
      .select('*')
      .eq('is_active', true)
      .order('created_at')
    flows = data || []
  } else {
    const { data } = await admin
      .from('flow_access')
      .select('flows(*)')
      .eq('profile_id', user.id)
    flows = (data?.map((d: { flows: unknown }) => d.flows).filter(Boolean) as Flow[]) || []
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = profile?.full_name?.split(' ')[0] || 'toi'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#3f3f46]" />
          <span className="text-[#3f3f46] text-xs tracking-widest uppercase font-medium">Automations</span>
        </div>
        <h1 className="text-3xl font-semibold text-white">
          {greeting}, {firstName}
        </h1>
        <p className="text-[#71717a] text-sm mt-2">
          {flows.length === 0
            ? "Aucun flow disponible pour le moment."
            : `${flows.length} flow${flows.length > 1 ? 's' : ''} disponible${flows.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {flows.length === 0 ? (
        <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-16 text-center">
          <p className="text-[#3f3f46] text-sm">Aucun flow ne vous a encore été assigné.</p>
          <p className="text-[#3f3f46] text-xs mt-1">Contactez votre administrateur.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flows.map((flow) => (
            <FlowCard key={flow.id} flow={flow} />
          ))}
        </div>
      )}
    </div>
  )
}

function FlowCard({ flow }: { flow: Flow }) {
  return (
    <Link
      href={`/flows/${flow.id}`}
      className="group relative flex flex-col bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-6 hover:border-white/20 hover:bg-[#141414] transition-all duration-200"
    >
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:bg-white/10 transition-colors">
        <FlowIcon icon={flow.icon} className="w-4.5 h-4.5 text-white" />
      </div>
      {flow.category && (
        <span className="text-[10px] text-[#3f3f46] uppercase tracking-widest font-medium mb-2">
          {flow.category}
        </span>
      )}
      <h3 className="text-sm font-semibold text-white mb-2">{flow.name}</h3>
      {flow.description && (
        <p className="text-[#71717a] text-xs leading-relaxed mb-5 flex-1">{flow.description}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-[#71717a] group-hover:text-white transition-colors mt-auto">
        <span>Lancer le flow</span>
        <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#1e1e1e] group-hover:bg-white/30 transition-colors" />
    </Link>
  )
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Flow } from '@/types/database'
import { FlowIcon, ArrowRightIcon, StarIcon, LockIcon } from '@/components/ui/Icons'
import RequestAccessButton from '@/components/ui/RequestAccessButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('id', user.id).single()

  // Tous les flows actifs
  const { data: allFlows } = await admin.from('flows').select('*').eq('is_active', true).order('created_at')
  const flows: Flow[] = allFlows || []

  let accessFlowIds: string[] = []
  let requestedFlowIds: string[] = []

  if (profile?.role !== 'admin') {
    // Flows auxquels le client a accès
    const { data: accessRows } = await admin.from('flow_access').select('flow_id').eq('profile_id', user.id)
    accessFlowIds = accessRows?.map(r => r.flow_id) || []

    // Flows déjà demandés (pending ou rejected)
    const { data: requestRows } = await admin.from('access_requests').select('flow_id').eq('profile_id', user.id).eq('status', 'pending')
    requestedFlowIds = requestRows?.map(r => r.flow_id) || []
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = profile?.full_name?.split(' ')[0] || 'toi'

  const isAdmin = profile?.role === 'admin'
  const accessibleCount = isAdmin ? flows.length : accessFlowIds.length

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#3f3f46]" />
          <span className="text-[#3f3f46] text-xs tracking-widest uppercase font-medium">Automations</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">{greeting}, {firstName}</h1>
        <p className="text-[#71717a] text-sm mt-2">
          {flows.length === 0
            ? "Aucun flow disponible pour le moment."
            : `${accessibleCount} flow${accessibleCount > 1 ? 's' : ''} accessible${accessibleCount > 1 ? 's' : ''}${!isAdmin && flows.length > accessibleCount ? ` · ${flows.length - accessibleCount} verrouillé${flows.length - accessibleCount > 1 ? 's' : ''}` : ''}`}
        </p>
      </div>

      {flows.length === 0 ? (
        <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-8 md:p-16 text-center">
          <p className="text-[#3f3f46] text-sm">Aucun flow disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {flows.map((flow) => {
            const hasAccess = isAdmin || accessFlowIds.includes(flow.id)
            const alreadyRequested = requestedFlowIds.includes(flow.id)
            if (hasAccess) {
              return <FlowCard key={flow.id} flow={flow} />
            } else {
              return <LockedFlowCard key={flow.id} flow={flow} alreadyRequested={alreadyRequested} />
            }
          })}
        </div>
      )}
    </div>
  )
}

function FlowCard({ flow }: { flow: Flow }) {
  return (
    <Link
      href={`/flows/${flow.id}`}
      className="group relative flex flex-col bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 md:p-6 hover:border-white/20 hover:bg-[#141414] transition-all duration-200"
    >
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 md:mb-5 group-hover:bg-white/10 transition-colors">
        <FlowIcon icon={flow.icon} className="w-4 h-4 text-white" />
      </div>
      {flow.category && (
        <span className="text-[10px] text-[#3f3f46] uppercase tracking-widest font-medium mb-2">{flow.category}</span>
      )}
      <h3 className="text-sm font-semibold text-white mb-2">{flow.name}</h3>
      {flow.description && (
        <p className="text-[#71717a] text-xs leading-relaxed mb-4 md:mb-5 flex-1">{flow.description}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-[#71717a] group-hover:text-white transition-colors mt-auto">
        <span>Lancer le flow</span>
        <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#1e1e1e] group-hover:bg-white/30 transition-colors" />
    </Link>
  )
}

function LockedFlowCard({ flow, alreadyRequested }: { flow: Flow; alreadyRequested: boolean }) {
  return (
    <div className="relative flex flex-col bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 md:p-6 opacity-60">
      <div className="w-10 h-10 rounded-xl bg-white/3 border border-white/5 flex items-center justify-center mb-4 md:mb-5">
        <FlowIcon icon={flow.icon} className="w-4 h-4 text-[#3f3f46]" />
      </div>
      {flow.category && (
        <span className="text-[10px] text-[#2a2a2a] uppercase tracking-widest font-medium mb-2">{flow.category}</span>
      )}
      <h3 className="text-sm font-semibold text-[#71717a] mb-2">{flow.name}</h3>
      {flow.description && (
        <p className="text-[#3f3f46] text-xs leading-relaxed mb-4 md:mb-5 flex-1">{flow.description}</p>
      )}
      <div className="mt-auto">
        <RequestAccessButton flowId={flow.id} alreadyRequested={alreadyRequested} />
      </div>
      {/* Icône cadenas */}
      <div className="absolute top-4 right-4">
        <LockIcon className="w-3.5 h-3.5 text-[#2a2a2a]" />
      </div>
    </div>
  )
}

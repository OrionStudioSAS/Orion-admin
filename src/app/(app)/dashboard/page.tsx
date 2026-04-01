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

  const isAdmin = profile?.role === 'admin'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = profile?.full_name?.split(' ')[0] || 'toi'

  // ── CLIENT DASHBOARD ──────────────────────────────────────────────────────
  if (!isAdmin) {
    // Fetch all active flows, user access, and pending requests
    const [
      { data: allActiveFlows },
      { data: accessRows },
      { data: pendingRequests },
    ] = await Promise.all([
      admin.from('flows').select('*').eq('is_active', true).order('created_at'),
      admin.from('flow_access').select('flow_id').eq('profile_id', user.id),
      admin.from('access_requests').select('flow_id').eq('profile_id', user.id).eq('status', 'pending'),
    ])

    const allFlows: Flow[] = allActiveFlows || []
    const accessIds = new Set((accessRows || []).map(a => a.flow_id))
    const pendingIds = new Set((pendingRequests || []).map(r => r.flow_id))

    const authorizedFlows = allFlows.filter(f => accessIds.has(f.id))
    const unauthorizedFlows = allFlows.filter(f => !accessIds.has(f.id))

    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="mb-8 md:mb-10">
          <div className="flex items-center gap-2 mb-3">
            <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
            <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Automatisations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">{greeting}, {firstName}</h1>
          <p className="text-[#a1a1aa] text-sm mt-2">
            {authorizedFlows.length === 0
              ? "Aucune automatisation disponible pour le moment."
              : `${authorizedFlows.length} automatisation${authorizedFlows.length > 1 ? 's' : ''} disponible${authorizedFlows.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {allFlows.length === 0 ? (
          <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-8 md:p-16 text-center">
            <p className="text-[#a1a1aa] text-sm">Aucune automatisation disponible pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Authorized flows */}
            {authorizedFlows.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {authorizedFlows.map((flow) => <FlowCard key={flow.id} flow={flow} />)}
              </div>
            )}

            {/* Unauthorized flows */}
            {unauthorizedFlows.length > 0 && (
              <div>
                {authorizedFlows.length > 0 && (
                  <div className="text-[10px] text-[#52525b] uppercase tracking-widest font-medium mb-3">Autres automatisations</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {unauthorizedFlows.map((flow) => (
                    <LockedFlowCard key={flow.id} flow={flow} alreadyRequested={pendingIds.has(flow.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── ADMIN DASHBOARD ───────────────────────────────────────────────────────
  const { data: allFlows } = await admin.from('flows').select('*').eq('is_active', true).order('created_at')
  const flows: Flow[] = allFlows || []

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Automatisations</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">{greeting}, {firstName}</h1>
        <p className="text-[#a1a1aa] text-sm mt-2">
          {flows.length === 0
            ? "Aucune automatisation disponible pour le moment."
            : `${flows.length} automatisation${flows.length > 1 ? 's' : ''} active${flows.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {flows.length === 0 ? (
        <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-8 md:p-16 text-center">
          <p className="text-[#a1a1aa] text-sm">Aucune automatisation disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {flows.map((flow) => <FlowCard key={flow.id} flow={flow} />)}
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
        <span className="text-[10px] text-[#a1a1aa] uppercase tracking-widest font-medium mb-2">{flow.category}</span>
      )}
      <h3 className="text-sm font-semibold text-white mb-2">{flow.name}</h3>
      {flow.description && (
        <p className="text-[#a1a1aa] text-xs leading-relaxed mb-4 md:mb-5 flex-1">{flow.description}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-[#a1a1aa] group-hover:text-white transition-colors mt-auto">
        <span>Lancer l&apos;automatisation</span>
        <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#1e1e1e] group-hover:bg-white/30 transition-colors" />
    </Link>
  )
}

function LockedFlowCard({ flow, alreadyRequested }: { flow: Flow; alreadyRequested: boolean }) {
  return (
    <div className="relative flex flex-col bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 md:p-6 opacity-60">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 md:mb-5">
        <FlowIcon icon={flow.icon} className="w-4 h-4 text-[#52525b]" />
      </div>
      {flow.category && (
        <span className="text-[10px] text-[#52525b] uppercase tracking-widest font-medium mb-2">{flow.category}</span>
      )}
      <h3 className="text-sm font-semibold text-[#a1a1aa] mb-2">{flow.name}</h3>
      {flow.description && (
        <p className="text-[#52525b] text-xs leading-relaxed mb-4 md:mb-5 flex-1">{flow.description}</p>
      )}
      <div className="mt-auto">
        <RequestAccessButton flowId={flow.id} alreadyRequested={alreadyRequested} />
      </div>
      <div className="absolute top-4 right-4">
        <LockIcon className="w-3.5 h-3.5 text-[#3f3f46]" />
      </div>
    </div>
  )
}



import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CheckIcon, XIcon, StarIcon } from '@/components/ui/Icons'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = admin
    .from('flow_executions')
    .select('*, flows(name, icon, category), profiles(full_name, email, company)')
    .order('executed_at', { ascending: false })
    .limit(100)

  if (!isAdmin) query = query.eq('profile_id', user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: executions } = await query as any

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#3f3f46]" />
          <span className="text-[#3f3f46] text-xs tracking-widest uppercase font-medium">Historique</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Exécutions</h1>
        <p className="text-[#71717a] text-sm mt-2">
          {isAdmin ? 'Toutes les exécutions' : 'Vos dernières exécutions'}
        </p>
      </div>

      {!executions || executions.length === 0 ? (
        <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-8 md:p-16 text-center">
          <p className="text-[#3f3f46] text-sm">Aucune exécution pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {executions.map((exec: any) => {
            const flow = exec.flows as { name: string; icon: string; category: string } | null
            const execProfile = exec.profiles as { full_name: string | null; email: string; company: string | null } | null
            const date = new Date(exec.executed_at)
            // Payload : on extrait les valeurs lisibles
            const payload = exec.payload as Record<string, unknown> | null
            const payloadEntries = payload ? Object.entries(payload).filter(([k]) => k !== 'flow_id') : []

            return (
              <div key={exec.id} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl overflow-hidden hover:border-white/10 transition-colors">
                {/* Ligne principale */}
                <div className="flex items-center gap-3 md:gap-4 px-3 md:px-5 py-3 md:py-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                    ${exec.status === 'success' ? 'bg-green-500/10 border border-green-500/20'
                      : exec.status === 'error' ? 'bg-red-500/10 border border-red-500/20'
                      : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                    {exec.status === 'success' ? <CheckIcon className="w-3 h-3 text-green-400" />
                      : exec.status === 'error' ? <XIcon className="w-3 h-3 text-red-400" />
                      : <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{flow?.name || 'Flow supprimé'}</span>
                      {isAdmin && execProfile && (
                        <span className="text-[10px] text-[#71717a] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full shrink-0">
                          {execProfile.company || execProfile.full_name || execProfile.email}
                        </span>
                      )}
                    </div>
                    {flow?.category && (
                      <div className="text-[11px] text-[#3f3f46] uppercase tracking-wider mt-0.5 hidden sm:block">{flow.category}</div>
                    )}
                  </div>

                  <span className={`text-[10px] px-2 md:px-2.5 py-1 rounded-full font-medium uppercase tracking-wider shrink-0
                    ${exec.status === 'success' ? 'text-green-400 bg-green-500/10'
                      : exec.status === 'error' ? 'text-red-400 bg-red-500/10'
                      : 'text-yellow-400 bg-yellow-500/10'}`}>
                    {exec.status}
                  </span>

                  <div className="text-[#3f3f46] text-xs shrink-0 text-right hidden sm:block">
                    <div>{date.toLocaleDateString('fr-FR')}</div>
                    <div>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                {/* Payload — champs de la requête */}
                {payloadEntries.length > 0 && (
                  <div className="border-t border-[#1a1a1a] px-3 md:px-5 py-2.5 flex flex-wrap gap-x-5 gap-y-1.5 bg-[#080808]">
                    {payloadEntries.map(([key, value]) => (
                      <div key={key} className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-[9px] uppercase tracking-widest text-[#3f3f46] font-medium shrink-0">{key}</span>
                        <span className="text-xs text-[#71717a] truncate max-w-[240px]">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

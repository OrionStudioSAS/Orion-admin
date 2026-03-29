import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CheckIcon, XIcon, StarIcon } from '@/components/ui/Icons'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = admin
    .from('flow_executions')
    .select('*, flows(name, icon, category)')
    .order('executed_at', { ascending: false })
    .limit(50)

  if (profile?.role !== 'admin') {
    query = query.eq('profile_id', user.id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: executions } = await query as any

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#3f3f46]" />
          <span className="text-[#3f3f46] text-xs tracking-widest uppercase font-medium">Historique</span>
        </div>
        <h1 className="text-3xl font-semibold text-white">Exécutions</h1>
        <p className="text-[#71717a] text-sm mt-2">
          {profile?.role === 'admin' ? 'Toutes les exécutions' : 'Vos dernières exécutions'}
        </p>
      </div>

      {!executions || executions.length === 0 ? (
        <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-16 text-center">
          <p className="text-[#3f3f46] text-sm">Aucune exécution pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {executions.map((exec: any) => {
            const flow = exec.flows as { name: string; icon: string; category: string } | null
            const date = new Date(exec.executed_at)
            return (
              <div
                key={exec.id}
                className="flex items-center gap-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl px-5 py-4 hover:border-white/10 transition-colors"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                  ${exec.status === 'success'
                    ? 'bg-green-500/10 border border-green-500/20'
                    : exec.status === 'error'
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-yellow-500/10 border border-yellow-500/20'
                  }`}>
                  {exec.status === 'success'
                    ? <CheckIcon className="w-3 h-3 text-green-400" />
                    : exec.status === 'error'
                    ? <XIcon className="w-3 h-3 text-red-400" />
                    : <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {flow?.name || 'Flow supprimé'}
                  </div>
                  {flow?.category && (
                    <div className="text-[11px] text-[#3f3f46] uppercase tracking-wider mt-0.5">{flow.category}</div>
                  )}
                </div>

                <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium uppercase tracking-wider
                  ${exec.status === 'success'
                    ? 'text-green-400 bg-green-500/10'
                    : exec.status === 'error'
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-yellow-400 bg-yellow-500/10'
                  }`}>
                  {exec.status}
                </span>

                <div className="text-[#3f3f46] text-xs shrink-0 text-right">
                  <div>{date.toLocaleDateString('fr-FR')}</div>
                  <div className="text-[#2a2a2a]">{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

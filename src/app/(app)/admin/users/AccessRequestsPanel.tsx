'use client'

import { useTransition } from 'react'
import { approveAccessRequest, rejectAccessRequest } from '@/app/actions/users'
import { CheckIcon, XIcon, BellIcon } from '@/components/ui/Icons'

interface Request {
  id: string
  profile_id: string
  flow_id: string
  created_at: string
  profiles: { full_name: string | null; email: string } | null
  flows: { name: string } | null
}

interface Props {
  requests: Request[]
}

export default function AccessRequestsPanel({ requests }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleApprove(req: Request) {
    startTransition(async () => {
      await approveAccessRequest(req.id, req.profile_id, req.flow_id)
    })
  }

  function handleReject(req: Request) {
    startTransition(async () => {
      await rejectAccessRequest(req.id)
    })
  }

  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 md:px-5 py-4 border-b border-[#1e1e1e]">
        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
          <BellIcon className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">Demandes d'accès</span>
        <span className="ml-auto text-[10px] font-semibold bg-white text-black px-2 py-0.5 rounded-full">
          {requests.length}
        </span>
      </div>

      <div className="divide-y divide-[#1e1e1e]">
        {requests.map((req) => {
          const user = req.profiles
          const flow = req.flows
          const date = new Date(req.created_at)
          const name = user?.full_name || user?.email || 'Inconnu'

          return (
            <div key={req.id} className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-white uppercase">{name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{name}</div>
                <div className="text-xs text-[#71717a] mt-0.5">
                  souhaite accéder à <span className="text-white">{flow?.name || 'Flow inconnu'}</span>
                </div>
              </div>
              <div className="text-[#3f3f46] text-[10px] shrink-0 hidden sm:block">
                {date.toLocaleDateString('fr-FR')}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleApprove(req)}
                  disabled={isPending}
                  title="Approuver"
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                >
                  <CheckIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Approuver</span>
                </button>
                <button
                  onClick={() => handleReject(req)}
                  disabled={isPending}
                  title="Refuser"
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-[#71717a] hover:text-red-400 hover:bg-red-500/10 border border-[#1e1e1e] hover:border-red-500/20 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                >
                  <XIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Refuser</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { requestFlowAccess } from '@/app/actions/users'
import { BellIcon, CheckIcon } from '@/components/ui/Icons'

interface Props {
  flowId: string
  alreadyRequested: boolean
}

export default function RequestAccessButton({ flowId, alreadyRequested }: Props) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(alreadyRequested)

  function handleRequest() {
    startTransition(async () => {
      await requestFlowAccess(flowId)
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-[#71717a]">
        <CheckIcon className="w-3 h-3" />
        Demande envoyée
      </div>
    )
  }

  return (
    <button
      onClick={handleRequest}
      disabled={isPending}
      className="flex items-center gap-1.5 text-[10px] text-[#71717a] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
    >
      <BellIcon className="w-3 h-3" />
      {isPending ? 'Envoi...' : 'Demander l\'accès'}
    </button>
  )
}

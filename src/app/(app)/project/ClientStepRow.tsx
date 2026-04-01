'use client'

import { useState, useTransition } from 'react'
import StepChatPanel from '@/components/chat/StepChatPanel'
import { approveStep } from '@/app/actions/projects'
import { StepMessage } from '@/types/database'

interface Step {
  id: string
  title: string
  description: string | null
  status: string
  start_date: string | null
  end_date: string | null
  client_approved: boolean
}

interface Props {
  idx: number
  step: Step
  isDone: boolean
  isInProgress: boolean
  msgs: StepMessage[]
  unread: number
  profileId: string
  projectId: string
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function ClientStepRow({ idx, step, isDone, isInProgress, msgs, unread, profileId, projectId }: Props) {
  const [chatOpen, setChatOpen] = useState(false)
  const [approving, startApproveTransition] = useTransition()
  const [approved, setApproved] = useState(step.client_approved)

  function handleApprove() {
    startApproveTransition(async () => {
      await approveStep(step.id, projectId)
      setApproved(true)
    })
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all
          ${isDone
            ? 'bg-green-500/20 border-green-500/40'
            : isInProgress
              ? 'bg-blue-500/20 border-blue-500/40'
              : 'border-[#2a2a2a] bg-transparent'}`}>
          {isDone ? (
            <svg className="w-3 h-3 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : isInProgress ? (
            <div className="w-2 h-2 rounded-full bg-blue-400" />
          ) : (
            <span className="text-[8px] text-[#52525b] font-mono">{idx + 1}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className={`text-sm font-medium transition-colors ${isDone ? 'text-[#52525b] line-through decoration-[#3f3f46]' : 'text-white'}`}>
            {step.title}
          </div>
          {step.description && (
            <div className="text-xs text-[#52525b] mt-0.5">{step.description}</div>
          )}
          {/* Dates */}
          {(step.start_date || step.end_date) && (
            <div className="flex items-center gap-2 mt-1">
              {step.start_date && (
                <span className="text-[10px] text-[#52525b] flex items-center gap-1">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
                  </svg>
                  <span className="text-[#a1a1aa]">{formatDate(step.start_date)}</span>
                </span>
              )}
              {step.start_date && step.end_date && <span className="text-[#3f3f46]">→</span>}
              {step.end_date && (
                <span className="text-[10px] text-[#a1a1aa]">{formatDate(step.end_date)}</span>
              )}
            </div>
          )}
        </div>

        {/* Status badge */}
        {isInProgress && (
          <span className="text-[9px] font-semibold text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded-full px-2 py-0.5 shrink-0 mt-0.5">
            En cours
          </span>
        )}
        {isDone && (
          <span className="text-[9px] font-semibold text-green-400 border border-green-500/30 bg-green-500/10 rounded-full px-2 py-0.5 shrink-0 mt-0.5">
            Terminé
          </span>
        )}

        {/* Approve button */}
        {isDone && !approved && (
          <button
            type="button"
            onClick={handleApprove}
            disabled={approving}
            className="flex items-center gap-1 text-[9px] font-semibold text-white bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-full px-2.5 py-1 shrink-0 mt-0.5 transition-all cursor-pointer disabled:opacity-50"
            title="Valider cette étape"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {approving ? '...' : 'Valider'}
          </button>
        )}
        {approved && (
          <span className="text-[9px] font-semibold text-green-400 border border-green-500/30 bg-green-500/10 rounded-full px-2 py-0.5 shrink-0 mt-0.5 flex items-center gap-1">
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Validé
          </span>
        )}

        {/* Chat toggle */}
        <button
          type="button"
          onClick={() => setChatOpen(o => !o)}
          className={`relative flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all shrink-0 cursor-pointer
            ${chatOpen
              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
              : unread > 0
                ? 'text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10'
                : 'text-[#52525b] border-[#1e1e1e] hover:text-[#a1a1aa] hover:border-white/10'}`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round"/>
          </svg>
          {msgs.length > 0 && <span>{msgs.length}</span>}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">{unread}</span>
          )}
        </button>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="ml-9 mt-2">
          <StepChatPanel
            stepId={step.id}
            projectId={projectId}
            profileId={profileId}
            isAdmin={false}
            initialMessages={msgs}
          />
        </div>
      )}
    </div>
  )
}

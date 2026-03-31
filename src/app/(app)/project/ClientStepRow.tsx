'use client'

import { useState } from 'react'
import StepChatPanel from '@/components/chat/StepChatPanel'
import { StepMessage } from '@/types/database'

interface Step {
  id: string
  title: string
  description: string | null
  status: string
  start_date: string | null
  end_date: string | null
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

  return (
    <div>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all
          ${isDone ? 'bg-white border-white' : isInProgress ? 'border-blue-500/50 bg-blue-500/10' : 'border-[#2a2a2a] bg-transparent'}`}>
          {isDone ? (
            <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
          <div className={`text-sm font-medium transition-colors ${isDone ? 'text-[#a1a1aa] line-through decoration-[#3f3f46]' : 'text-white'}`}>
            {step.title}
          </div>
          {step.description && (
            <div className="text-xs text-[#52525b] mt-0.5">{step.description}</div>
          )}
          {/* Dates */}
          {(step.start_date || step.end_date) && (
            <div className="flex items-center gap-2 mt-1">
              {step.start_date && (
                <span className="text-[10px] text-[#52525b]">
                  Début : <span className="text-[#a1a1aa]">{formatDate(step.start_date)}</span>
                </span>
              )}
              {step.start_date && step.end_date && <span className="text-[#3f3f46]">·</span>}
              {step.end_date && (
                <span className="text-[10px] text-[#52525b]">
                  Fin : <span className="text-[#a1a1aa]">{formatDate(step.end_date)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Chat toggle */}
        <button
          type="button"
          onClick={() => setChatOpen(o => !o)}
          className={`relative flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all shrink-0
            ${chatOpen ? 'bg-white/10 text-white border-white/20' : 'text-[#52525b] border-[#1e1e1e] hover:text-[#a1a1aa] hover:border-white/10'}`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round"/>
          </svg>
          {msgs.length > 0 && <span>{msgs.length}</span>}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">{unread}</span>
          )}
        </button>

        {/* Status badge */}
        {isInProgress && (
          <span className="text-[9px] font-semibold text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded-full px-2 py-0.5 shrink-0 mt-0.5">
            En cours
          </span>
        )}
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

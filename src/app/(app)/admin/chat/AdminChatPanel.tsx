'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageIcon } from '@/components/ui/Icons'
import ChatWindow from '@/components/chat/ChatWindow'
import { SupportMessage } from '@/types/database'

interface Conversation {
  profile: {
    id: string
    full_name: string | null
    email: string
    company: string | null
  }
  latestMessage: SupportMessage
  unreadCount: number
}

interface Props {
  initialConversations: Conversation[]
  adminId: string
}

export default function AdminChatPanel({ initialConversations, adminId }: Props) {
  const [conversations, setConversations] = useState(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.profile?.id || null
  )
  const [showList, setShowList] = useState(true)
  const supabase = createClient()

  const selected = conversations.find(c => c.profile?.id === selectedId)

  // Real-time: update conversation list when new messages arrive
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const msg = payload.new as SupportMessage
          setConversations(prev => {
            const existing = prev.find(c => c.profile?.id === msg.profile_id)
            if (existing) {
              return prev.map(c => {
                if (c.profile?.id !== msg.profile_id) return c
                return {
                  ...c,
                  latestMessage: msg,
                  unreadCount: (msg.is_admin_sender || msg.profile_id === selectedId)
                    ? c.unreadCount
                    : c.unreadCount + 1,
                }
              })
            }
            // New conversation - refresh needed but keep what we have
            return prev
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  function selectConversation(id: string) {
    setSelectedId(id)
    // Mark as read in UI immediately
    setConversations(prev => prev.map(c =>
      c.profile?.id === id ? { ...c, unreadCount: 0 } : c
    ))
    setShowList(false) // mobile: hide list, show chat
  }

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Left: Conversation list */}
      <div className={`
        flex flex-col w-full md:w-72 shrink-0 border-r border-[#1e1e1e]
        ${!showList ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="px-4 py-3.5 border-b border-[#1e1e1e] shrink-0">
          <div className="text-xs font-semibold text-white uppercase tracking-widest">Conversations</div>
          <div className="text-[11px] text-[#a1a1aa] mt-0.5">{conversations.length} membre{conversations.length > 1 ? 's' : ''}</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-[#a1a1aa] text-xs">Aucune conversation.</p>
            </div>
          )}
          {conversations.map((conv) => {
            const isActive = conv.profile?.id === selectedId
            const name = conv.profile?.full_name || conv.profile?.email || 'Inconnu'
            const date = new Date(conv.latestMessage.created_at)
            const isToday = date.toDateString() === new Date().toDateString()

            return (
              <button
                key={conv.profile?.id}
                onClick={() => selectConversation(conv.profile?.id)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-[#0f0f0f] transition-colors
                  ${isActive ? 'bg-white/5' : 'hover:bg-white/3'}`}
              >
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-white uppercase">{name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white truncate">{name}</span>
                    <span className="text-[9px] text-[#a1a1aa] shrink-0">
                      {isToday
                        ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {conv.profile?.company && (
                    <div className="text-[10px] text-[#a1a1aa] mt-0.5">{conv.profile.company}</div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-[#a1a1aa] truncate max-w-[160px]">
                      {conv.latestMessage.is_admin_sender ? 'Vous : ' : ''}
                      {conv.latestMessage.content}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 text-[9px] font-bold bg-white text-black w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: Chat window */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${showList ? 'hidden md:flex' : 'flex'}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <MessageIcon className="w-5 h-5 text-[#a1a1aa]" />
            </div>
            <p className="text-[#a1a1aa] text-sm">Sélectionnez une conversation</p>
            <p className="text-[#a1a1aa] text-xs mt-1">pour voir les messages</p>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] shrink-0">
              <button
                onClick={() => setShowList(true)}
                className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-all"
              >
                ←
              </button>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-white uppercase">
                  {(selected.profile?.full_name || selected.profile?.email || 'I')[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">
                  {selected.profile?.full_name || selected.profile?.email}
                </div>
                {selected.profile?.company && (
                  <div className="text-[11px] text-[#a1a1aa]">{selected.profile.company}</div>
                )}
              </div>
            </div>
            <ChatWindow
              key={selectedId!}
              profileId={selectedId!}
              isAdmin={true}
            />
          </>
        )}
      </div>
    </div>
  )
}

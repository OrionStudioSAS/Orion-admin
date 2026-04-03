'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageIcon, PlusIcon } from '@/components/ui/Icons'
import ChatWindow from '@/components/chat/ChatWindow'
import { SupportMessage } from '@/types/database'

interface UserInfo {
  id: string
  full_name: string | null
  email: string
  company: string | null
}

interface Conversation {
  profile: UserInfo
  latestMessage: SupportMessage
  unreadCount: number
}

interface Props {
  initialConversations: Conversation[]
  adminId: string
  allUsers: UserInfo[]
}

export default function AdminChatPanel({ initialConversations, adminId, allUsers }: Props) {
  const [conversations, setConversations] = useState(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.profile?.id || null
  )
  const [showList, setShowList] = useState(true)
  const [showNewConv, setShowNewConv] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const selected = conversations.find(c => c.profile?.id === selectedId)
  // For new conversations (user not yet in conversations list)
  const selectedUser = !selected ? allUsers.find(u => u.id === selectedId) : null

  // Users that don't have conversations yet
  const existingIds = new Set(conversations.map(c => c.profile?.id))
  const availableUsers = allUsers.filter(u => {
    if (existingIds.has(u.id)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (u.full_name?.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      (u.company?.toLowerCase().includes(q))
    )
  })

  // Focus search when opening new conversation panel
  useEffect(() => {
    if (showNewConv) searchRef.current?.focus()
  }, [showNewConv])

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
            // New conversation created by sending first message — add to list
            const user = allUsers.find(u => u.id === msg.profile_id)
            if (user) {
              return [{
                profile: user,
                latestMessage: msg,
                unreadCount: msg.is_admin_sender ? 0 : 1,
              }, ...prev]
            }
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
    setShowNewConv(false)
    setSearch('')
  }

  function startNewConversation(user: UserInfo) {
    // If conversation already exists, just select it
    const existing = conversations.find(c => c.profile?.id === user.id)
    if (existing) {
      selectConversation(user.id)
      return
    }
    // Select this user — ChatWindow will handle empty state
    setSelectedId(user.id)
    setShowList(false)
    setShowNewConv(false)
    setSearch('')
  }

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Left: Conversation list */}
      <div className={`
        flex flex-col w-full md:w-72 shrink-0 border-r border-[#1e1e1e]
        ${!showList ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="px-4 py-3.5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white uppercase tracking-widest">Conversations</div>
              <div className="text-[11px] text-[#a1a1aa] mt-0.5">{conversations.length} membre{conversations.length > 1 ? 's' : ''}</div>
            </div>
            <button
              type="button"
              onClick={() => { setShowNewConv(v => !v); setSearch('') }}
              className={`flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer
                ${showNewConv
                  ? 'bg-white text-black border-white'
                  : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
              title="Nouvelle conversation"
            >
              <PlusIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Nouveau</span>
            </button>
          </div>
        </div>

        {/* New conversation search */}
        {showNewConv && (
          <div className="border-b border-[#1e1e1e] bg-[#080808]">
            <div className="px-3 py-2.5">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un utilisateur..."
                className="w-full bg-[#0f0f0f] border border-[#1e1e1e] text-white text-xs rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {availableUsers.length === 0 ? (
                <p className="text-[10px] text-[#52525b] text-center py-3">
                  {search.trim() ? 'Aucun résultat' : 'Tous les utilisateurs ont déjà une conversation'}
                </p>
              ) : (
                availableUsers.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => startNewConversation(user)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-white uppercase">
                        {(user.full_name || user.email)[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">
                        {user.full_name || user.email}
                      </div>
                      {user.company && (
                        <div className="text-[10px] text-[#a1a1aa] truncate">{user.company}</div>
                      )}
                      {user.full_name && (
                        <div className="text-[10px] text-[#52525b] truncate">{user.email}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Existing conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && !showNewConv && (
            <div className="p-6 text-center">
              <p className="text-[#a1a1aa] text-xs">Aucune conversation.</p>
              <p className="text-[#52525b] text-[10px] mt-1">Cliquez sur + pour envoyer un message.</p>
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
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-[#0f0f0f] transition-colors cursor-pointer
                  ${isActive ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
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
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <MessageIcon className="w-5 h-5 text-[#a1a1aa]" />
            </div>
            <p className="text-[#a1a1aa] text-sm">Sélectionnez une conversation</p>
            <p className="text-[#52525b] text-xs mt-1">ou cliquez sur + pour en créer une</p>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] shrink-0">
              <button
                onClick={() => setShowList(true)}
                className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                ←
              </button>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-white uppercase">
                  {((selected?.profile?.full_name || selected?.profile?.email || selectedUser?.full_name || selectedUser?.email || 'I')[0])}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">
                  {selected?.profile?.full_name || selected?.profile?.email || selectedUser?.full_name || selectedUser?.email}
                </div>
                {(selected?.profile?.company || selectedUser?.company) && (
                  <div className="text-[11px] text-[#a1a1aa]">{selected?.profile?.company || selectedUser?.company}</div>
                )}
              </div>
            </div>
            <ChatWindow
              key={selectedId}
              profileId={selectedId}
              isAdmin={true}
            />
          </>
        )}
      </div>
    </div>
  )
}

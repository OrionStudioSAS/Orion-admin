'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMessages, sendMessage, markMessagesRead } from '@/app/actions/chat'
import { SupportMessage } from '@/types/database'
import { SendIcon } from '@/components/ui/Icons'

interface Props {
  profileId: string
  isAdmin: boolean
  initialMessages?: SupportMessage[]
}

export default function ChatWindow({ profileId, isAdmin, initialMessages }: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages || [])
  const [loading, setLoading] = useState(!initialMessages)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  // Fetch messages when profileId changes (admin switching conversations)
  useEffect(() => {
    if (initialMessages && profileId === initialMessages[0]?.profile_id) return

    setLoading(true)
    setMessages([])
    getMessages(profileId).then(msgs => {
      setMessages(msgs)
      setLoading(false)
    })
    markMessagesRead(profileId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  // Mark as read on mount
  useEffect(() => {
    markMessagesRead(profileId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${profileId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `profile_id=eq.${profileId}` },
        (payload) => {
          const newMsg = payload.new as SupportMessage
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // Mark as read if it's from the other side
          if (newMsg.is_admin_sender !== isAdmin) {
            markMessagesRead(profileId)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim() || isPending) return
    const content = input.trim()
    setInput('')

    // Mise à jour optimiste — affiche le message immédiatement
    const tempMsg: SupportMessage = {
      id: `temp-${Date.now()}`,
      profile_id: profileId,
      sender_id: '',
      content,
      is_admin_sender: isAdmin,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    startTransition(async () => {
      await sendMessage(content, profileId)
      // Sync depuis la DB pour remplacer le message temporaire par le vrai
      const fresh = await getMessages(profileId)
      setMessages(fresh)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <p className="text-[#a1a1aa] text-sm">Aucun message pour le moment.</p>
            <p className="text-[#52525b] text-xs mt-1">
              {isAdmin ? 'Envoyez le premier message.' : 'Envoyez un message à notre équipe.'}
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = isAdmin ? msg.is_admin_sender : !msg.is_admin_sender
          const date = new Date(msg.created_at)
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] group`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-white text-black rounded-br-sm'
                    : 'bg-[#1a1a1a] text-white border border-[#2a2a2a] rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <div className={`text-[9px] mt-1 px-1 text-[#a1a1aa] ${isOwn ? 'text-right' : 'text-left'}`}>
                  {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1e1e1e] p-3 shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message… (Entrée pour envoyer)"
            rows={1}
            className="flex-1 bg-[#0a0a0a] border border-[#1e1e1e] text-white text-sm rounded-xl px-3 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors resize-none max-h-32 overflow-y-auto"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={!input.trim() || isPending}
            className="w-9 h-9 flex items-center justify-center bg-white text-black rounded-xl hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <SendIcon className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { sendStepMessage, getStepAttachmentUrl } from '@/app/actions/projects'
import { StepMessage } from '@/types/database'

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  stepId: string
  projectId: string
  profileId: string
  isAdmin: boolean
  initialMessages: StepMessage[]
}

export default function StepChatPanel({ stepId, projectId, profileId, isAdmin, initialMessages }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [input, setInput] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [initialMessages.length])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPendingFile(e.target.files?.[0] || null)
  }

  function handleSend() {
    if (!input.trim() && !pendingFile) return
    setError('')
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('stepId', stepId)
        fd.append('projectId', projectId)
        fd.append('profileId', profileId)
        fd.append('content', input.trim())
        if (pendingFile) fd.append('file', pendingFile)
        await sendStepMessage(fd)
        setInput('')
        setPendingFile(null)
        if (fileRef.current) fileRef.current.value = ''
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  async function handleDownloadAttachment(msg: StepMessage) {
    if (!msg.attachment_path) return
    setDownloadingId(msg.id)
    try {
      const url = await getStepAttachmentUrl(msg.attachment_path)
      const a = document.createElement('a')
      a.href = url
      a.download = msg.attachment_name || 'fichier'
      a.click()
    } catch {
      // silently fail
    }
    setDownloadingId(null)
  }

  const isImage = (type: string | null) => type?.startsWith('image/') ?? false

  return (
    <div className="mt-3 border border-[#1e1e1e] rounded-xl overflow-hidden bg-[#080808]">
      {/* Messages */}
      <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-3">
        {initialMessages.length === 0 ? (
          <p className="text-[11px] text-[#3f3f46] text-center py-4">Aucun message pour cette étape.</p>
        ) : (
          initialMessages.map(msg => {
            const isMine = isAdmin ? msg.is_admin_sender : !msg.is_admin_sender
            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm
                  ${isMine ? 'bg-white text-black' : 'bg-[#1a1a1a] text-white border border-[#2a2a2a]'}`}>
                  {/* Text content */}
                  {msg.content && <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}
                  {/* Attachment */}
                  {msg.attachment_path && (
                    <div className={`mt-1.5 ${msg.content ? 'mt-2' : ''}`}>
                      {isImage(msg.attachment_type) ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(msg)}
                          className="block"
                          title="Télécharger"
                        >
                          <div className={`text-[10px] mb-1 flex items-center gap-1 ${isMine ? 'text-black/60' : 'text-[#a1a1aa]'}`}>
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            {msg.attachment_name}
                            {msg.attachment_size && <span className="opacity-60">{formatBytes(msg.attachment_size)}</span>}
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(msg)}
                          disabled={downloadingId === msg.id}
                          className={`flex items-center gap-1.5 text-[11px] rounded-lg px-2 py-1.5 transition-all
                            ${isMine ? 'bg-black/10 hover:bg-black/20 text-black' : 'bg-white/5 hover:bg-white/10 text-[#a1a1aa] hover:text-white'}`}
                        >
                          {downloadingId === msg.id ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" strokeLinejoin="round"/></svg>
                          )}
                          <span className="truncate max-w-[160px]">{msg.attachment_name}</span>
                          {msg.attachment_size && <span className="opacity-60 shrink-0">{formatBytes(msg.attachment_size)}</span>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <span className={`text-[10px] mt-1 ${isMine ? 'text-[#52525b]' : 'text-[#3f3f46]'}`}>
                  {msg.is_admin_sender ? 'Admin' : 'Client'} · {formatTime(msg.created_at)}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#1e1e1e] px-3 py-2.5 bg-[#0a0a0a]">
        {pendingFile && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-white/5 rounded-lg">
            <svg className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" strokeLinejoin="round"/></svg>
            <span className="text-[11px] text-[#a1a1aa] truncate flex-1">{pendingFile.name}</span>
            <button type="button" onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = '' }}
              className="text-[#52525b] hover:text-white transition-colors text-xs">✕</button>
          </div>
        )}
        {error && <p className="text-[11px] text-red-400 mb-2">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Écrire un message..."
            rows={1}
            disabled={isPending}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            className="flex-1 bg-transparent text-white text-sm placeholder-[#3f3f46] resize-none outline-none leading-relaxed disabled:opacity-40 min-h-[24px] max-h-[96px] overflow-y-auto"
          />
          {/* File attach */}
          <label className="w-7 h-7 flex items-center justify-center rounded-lg text-[#52525b] hover:text-[#a1a1aa] cursor-pointer transition-colors shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
          </label>
          {/* Send */}
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending || (!input.trim() && !pendingFile)}
            className="w-7 h-7 flex items-center justify-center bg-white text-black rounded-lg hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
          >
            {isPending ? (
              <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

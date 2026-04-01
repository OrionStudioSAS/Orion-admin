'use client'

import { useState, useTransition } from 'react'
import { createStep, updateStep, deleteStep, reorderSteps } from '@/app/actions/projects'
import { ProjectStep, StepMessage } from '@/types/database'
import { PlusIcon, TrashIcon, CheckIcon } from '@/components/ui/Icons'
import StepChatPanel from '@/components/chat/StepChatPanel'

const STATUS_OPTIONS = [
  { value: 'todo', label: 'À faire', color: 'text-[#a1a1aa] border-[#2a2a2a] bg-[#111]' },
  { value: 'in_progress', label: 'En cours', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { value: 'done', label: 'Terminé', color: 'text-green-400 border-green-500/30 bg-green-500/10' },
] as const

const inputClass = "w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
const dateClass = "bg-[#080808] border border-[#1e1e1e] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-white/30 transition-colors [color-scheme:dark] cursor-pointer"

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function StepCircle({ status, idx }: { status: string; idx: number }) {
  if (status === 'done') {
    return (
      <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-2.5 h-2.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  if (status === 'in_progress') {
    return (
      <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
      </div>
    )
  }
  return (
    <div className="w-5 h-5 rounded-full border border-[#2a2a2a] flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-[9px] text-[#52525b] font-mono">{idx + 1}</span>
    </div>
  )
}

interface Props {
  projectId: string
  profileId: string
  steps: ProjectStep[]
  stepMessages: Record<string, StepMessage[]>
}

export default function StepsManager({ projectId, profileId, steps, stepMessages }: Props) {
  const [isPending, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [addError, setAddError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ title: string; description: string; start_date: string; end_date: string }>({ title: '', description: '', start_date: '', end_date: '' })
  const [dragging, setDragging] = useState<string | null>(null)
  const [localOrder, setLocalOrder] = useState<ProjectStep[]>(steps)
  const [openChatId, setOpenChatId] = useState<string | null>(null)

  if (
    steps.length !== localOrder.length ||
    steps.some((s, i) => s.id !== localOrder[i]?.id || s.status !== localOrder[i]?.status || s.title !== localOrder[i]?.title || s.start_date !== localOrder[i]?.start_date || s.end_date !== localOrder[i]?.end_date)
  ) {
    setLocalOrder(steps)
  }

  function handleAdd() {
    if (!newTitle.trim()) return
    setAddError('')
    startTransition(async () => {
      try {
        await createStep(projectId, profileId, { title: newTitle.trim(), description: newDesc.trim() || undefined })
        setNewTitle('')
        setNewDesc('')
        setAdding(false)
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  function handleStatusChange(step: ProjectStep, status: 'todo' | 'in_progress' | 'done') {
    startTransition(async () => {
      await updateStep(step.id, profileId, { status }, projectId)
    })
  }

  function startEdit(step: ProjectStep) {
    setEditingId(step.id)
    setEditForm({
      title: step.title,
      description: step.description || '',
      start_date: step.start_date || '',
      end_date: step.end_date || '',
    })
  }

  function handleEditSave(step: ProjectStep) {
    if (!editForm.title.trim()) return
    startTransition(async () => {
      await updateStep(step.id, profileId, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
      }, projectId)
      setEditingId(null)
    })
  }

  function handleDelete(stepId: string) {
    if (!confirm('Supprimer cette étape ?')) return
    startTransition(async () => {
      await deleteStep(stepId, profileId, projectId)
    })
  }

  function handleDragStart(id: string) { setDragging(id) }
  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragging || dragging === targetId) return
    const from = localOrder.findIndex(s => s.id === dragging)
    const to = localOrder.findIndex(s => s.id === targetId)
    if (from === -1 || to === -1) return
    const next = [...localOrder]
    next.splice(to, 0, next.splice(from, 1)[0])
    setLocalOrder(next)
  }
  function handleDrop() {
    if (!dragging) return
    setDragging(null)
    startTransition(async () => {
      await reorderSteps(projectId, profileId, localOrder.map(s => s.id))
    })
  }

  const donePct = localOrder.length ? Math.round(localOrder.filter(s => s.status === 'done').length / localOrder.length * 100) : 0
  const inProgressCount = localOrder.filter(s => s.status === 'in_progress').length
  const doneCount = localOrder.filter(s => s.status === 'done').length

  return (
    <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
        <div>
          <div className="text-sm font-semibold text-white">Étapes du projet</div>
          <div className="text-xs text-[#a1a1aa] mt-0.5 flex items-center gap-2">
            {localOrder.length > 0 ? (
              <>
                <span>{doneCount}/{localOrder.length} terminées</span>
                {inProgressCount > 0 && (
                  <span className="text-blue-400 text-[10px] font-medium bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                    {inProgressCount} en cours
                  </span>
                )}
              </>
            ) : 'Aucune étape définie'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setAdding(a => !a); setNewTitle(''); setNewDesc('') }}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer
            ${adding ? 'bg-white text-black border-white' : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
        >
          <PlusIcon className="w-3 h-3" />
          Étape
        </button>
      </div>

      {/* Progress bar */}
      {localOrder.length > 0 && (
        <div className="px-5 pt-4 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[#a1a1aa] uppercase tracking-widest">Progression</span>
            <span className={`text-[10px] font-medium ${donePct === 100 ? 'text-green-400' : donePct > 0 ? 'text-blue-400' : 'text-[#a1a1aa]'}`}>{donePct}%</span>
          </div>
          <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${donePct === 100 ? 'bg-green-400' : 'bg-blue-400'}`}
              style={{ width: `${donePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="px-5 py-4 bg-[#080808]/50 border-b border-[#1e1e1e]">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Titre de l'étape"
              className={inputClass}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            />
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optionnel)"
              className={inputClass}
            />
            {addError && <p className="text-xs text-red-400">{addError}</p>}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={isPending || !newTitle.trim()}
                className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                {isPending ? 'Ajout...' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-[#a1a1aa] text-xs px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Steps list */}
      {localOrder.length === 0 && !adding ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[#52525b] text-xs">Aucune étape. Cliquez sur Étape pour commencer.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#0a0a0a] pb-2">
          {localOrder.map((step, idx) => {
            const msgs = stepMessages[step.id] ?? []
            const unread = msgs.filter(m => !m.is_admin_sender && !m.is_read).length
            const isOpen = openChatId === step.id

            return (
              <div
                key={step.id}
                draggable
                onDragStart={() => handleDragStart(step.id)}
                onDragOver={e => handleDragOver(e, step.id)}
                onDrop={handleDrop}
                className={`px-5 py-3 transition-all ${dragging === step.id ? 'opacity-40' : ''}`}
              >
                {editingId === step.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                      className={inputClass}
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Description (optionnel)"
                      className={inputClass}
                    />
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-[#a1a1aa] uppercase tracking-widest whitespace-nowrap">Début</label>
                        <input
                          type="date"
                          value={editForm.start_date}
                          onChange={e => setEditForm(p => ({ ...p, start_date: e.target.value }))}
                          className={dateClass}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-[#a1a1aa] uppercase tracking-widest whitespace-nowrap">Fin</label>
                        <input
                          type="date"
                          value={editForm.end_date}
                          onChange={e => setEditForm(p => ({ ...p, end_date: e.target.value }))}
                          className={dateClass}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditSave(step)}
                        disabled={isPending || !editForm.title.trim()}
                        className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        <CheckIcon className="w-3 h-3" />
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-[#a1a1aa] text-xs px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start gap-3">
                      {/* Drag handle */}
                      <div className="mt-1 cursor-grab active:cursor-grabbing text-[#3f3f46] hover:text-[#a1a1aa] transition-colors shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="9" cy="7" r="1" fill="currentColor" /><circle cx="15" cy="7" r="1" fill="currentColor" />
                          <circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" />
                          <circle cx="9" cy="17" r="1" fill="currentColor" /><circle cx="15" cy="17" r="1" fill="currentColor" />
                        </svg>
                      </div>
                      {/* Status circle */}
                      <StepCircle status={step.status} idx={idx} />
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-medium text-white cursor-pointer hover:text-white/80 transition-colors"
                          onClick={() => startEdit(step)}
                        >
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
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
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
                      {/* Chat toggle */}
                      <button
                        type="button"
                        onClick={() => setOpenChatId(isOpen ? null : step.id)}
                        className={`relative flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all cursor-pointer
                          ${isOpen
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : unread > 0
                              ? 'text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10'
                              : 'text-[#52525b] border-[#1e1e1e] hover:text-[#a1a1aa] hover:border-white/10'}`}
                        title="Chat"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round"/>
                        </svg>
                        {msgs.length > 0 && <span>{msgs.length}</span>}
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">{unread}</span>
                        )}
                      </button>
                      {/* Status selector */}
                      <select
                        value={step.status}
                        onChange={e => handleStatusChange(step, e.target.value as 'todo' | 'in_progress' | 'done')}
                        disabled={isPending}
                        className={`text-[10px] font-semibold border rounded-lg px-2 py-1 appearance-none cursor-pointer transition-all disabled:opacity-50 shrink-0
                          ${STATUS_OPTIONS.find(o => o.value === step.status)?.color ?? ''}`}
                      >
                        {STATUS_OPTIONS.map(o => (
                          <option key={o.value} value={o.value} className="bg-[#0f0f0f] text-white">{o.label}</option>
                        ))}
                      </select>
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(step.id)}
                        disabled={isPending}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-[#3f3f46] hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 mt-0.5 cursor-pointer"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Chat panel */}
                    {isOpen && (
                      <StepChatPanel
                        stepId={step.id}
                        projectId={projectId}
                        profileId={profileId}
                        isAdmin={true}
                        initialMessages={msgs}
                      />
                    )}
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

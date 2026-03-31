'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/actions/projects'
import { PlusIcon } from '@/components/ui/Icons'

export default function CreateProjectButton({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  function handleCreate() {
    if (!name.trim()) return
    setError('')
    startTransition(async () => {
      try {
        const projectId = await createProject(profileId, name.trim())
        router.push(`/admin/projects/${projectId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-white/90 transition-all"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        Nouveau projet
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        value={name}
        onChange={e => { setName(e.target.value); setError('') }}
        placeholder="Nom du projet..."
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setOpen(false) }}
        className="bg-[#080808] border border-white/20 text-white text-sm rounded-xl px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/40 transition-colors w-56"
      />
      <button
        onClick={handleCreate}
        disabled={isPending || !name.trim()}
        className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-xl hover:bg-white/90 disabled:opacity-50 transition-all"
      >
        {isPending ? 'Création...' : 'Créer'}
      </button>
      <button
        onClick={() => { setOpen(false); setName('') }}
        className="text-[#a1a1aa] text-xs px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-all"
      >
        Annuler
      </button>
      {error && <p className="text-xs text-red-400 w-full">{error}</p>}
    </div>
  )
}

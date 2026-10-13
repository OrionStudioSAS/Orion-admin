'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { linkProjectToProfile, getUnlinkedProjects } from '@/app/actions/projects'
import { LinkIcon } from '@/components/ui/Icons'

type ProjectOption = {
  id: string
  name: string | null
  profiles: { full_name: string | null; email: string } | null
}

export default function LinkProjectButton({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getUnlinkedProjects(profileId)
      .then(data => setProjects(data.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string | null,
        profiles: Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles as ProjectOption['profiles'],
      }))))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [open, profileId])

  function handleLink(projectId: string) {
    setError('')
    startTransition(async () => {
      try {
        await linkProjectToProfile(projectId, profileId)
        setOpen(false)
        setSearch('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const name = (p.name || '').toLowerCase()
    const owner = (p.profiles?.full_name || p.profiles?.email || '').toLowerCase()
    return name.includes(q) || owner.includes(q)
  })

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-transparent text-white/70 text-xs font-medium px-3 py-2.5 rounded-xl border border-white/10 hover:border-white/20 hover:text-white transition-all cursor-pointer"
      >
        <LinkIcon className="w-3.5 h-3.5" />
        Lier un projet
      </button>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un projet..."
          autoFocus
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch('') } }}
          className="bg-[#080808] border border-white/20 text-white text-sm rounded-xl px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/40 transition-colors w-56"
        />
        <button
          onClick={() => { setOpen(false); setSearch('') }}
          className="text-[#a1a1aa] text-xs px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          Annuler
        </button>
      </div>

      <div className="absolute right-0 top-full mt-1 w-80 max-h-64 overflow-y-auto bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl shadow-xl z-50">
        {loading ? (
          <div className="px-4 py-6 text-center text-xs text-[#a1a1aa]">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-[#a1a1aa]">Aucun projet trouvé</div>
        ) : (
          filtered.map(p => (
            <button
              key={p.id}
              onClick={() => handleLink(p.id)}
              disabled={isPending}
              className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-[#1e1e1e] last:border-b-0 disabled:opacity-50 cursor-pointer"
            >
              <div className="text-sm text-white font-medium truncate">{p.name || 'Projet sans titre'}</div>
              <div className="text-[10px] text-[#a1a1aa] mt-0.5 truncate">
                {p.profiles?.full_name || p.profiles?.email || 'Sans propriétaire'}
              </div>
            </button>
          ))
        )}
      </div>

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

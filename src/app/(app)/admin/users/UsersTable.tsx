'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Profile, FlowAccess } from '@/types/database'
import { PlusIcon, EditIcon, CheckIcon, XIcon, KeyIcon, FolderIcon } from '@/components/ui/Icons'
import { updateUserRole, grantFlowAccess, revokeFlowAccess } from '@/app/actions/users'

interface Props {
  profiles: Profile[]
  flows: { id: string; name: string }[]
  accessList: FlowAccess[]
  currentUserId: string
}

const inputClass = "w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
const labelClass = "block text-[10px] text-[#a1a1aa] uppercase tracking-widest mb-2"

export default function UsersTable({ profiles, flows, accessList, currentUserId }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', role: 'client' as 'admin' | 'client' })
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError('')

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })

    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error || 'Erreur lors de la création.')
      setCreateLoading(false)
      return
    }

    setNewUser({ email: '', full_name: '', password: '', role: 'client' })
    setShowCreate(false)
    setCreateLoading(false)
    startTransition(() => { window.location.reload() })
  }

  function handleRoleChange(profileId: string, newRole: 'admin' | 'client') {
    startTransition(async () => {
      await updateUserRole(profileId, newRole)
    })
  }

  function handleToggleAccess(profileId: string, flowId: string, hasAccess: boolean) {
    startTransition(async () => {
      if (hasAccess) {
        await revokeFlowAccess(profileId, flowId)
      } else {
        await grantFlowAccess(profileId, flowId)
      }
    })
  }

  function getUserAccess(profileId: string) {
    return accessList.filter(a => a.profile_id === profileId).map(a => a.flow_id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm text-[#a1a1aa]">{profiles.length} utilisateur{profiles.length > 1 ? 's' : ''}</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-all cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Nouvel utilisateur
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateUser} className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-4 md:p-6 mb-6">
          <h3 className="text-sm font-semibold text-white mb-5">Créer un utilisateur</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Nom complet</label>
              <input
                type="text"
                value={newUser.full_name}
                onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Jean Dupont"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input
                type="email"
                value={newUser.email}
                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                required
                placeholder="jean@exemple.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Mot de passe *</label>
              <input
                type="password"
                value={newUser.password}
                onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                required
                minLength={8}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Rôle</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser(p => ({ ...p, role: e.target.value as 'admin' | 'client' }))}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {createError && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-4">
              {createError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createLoading}
              className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-5 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              <KeyIcon className="w-3.5 h-3.5" />
              {createLoading ? 'Création...' : 'Créer le compte'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-[#a1a1aa] text-xs px-4 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {profiles.map((profile) => {
          const userAccess = getUserAccess(profile.id)
          const isEditing = editingId === profile.id
          const isCurrentUser = profile.id === currentUserId
          const isAdmin = profile.role === 'admin'

          return (
            <div key={profile.id} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 md:gap-4 px-3 md:px-5 py-3 md:py-4">
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border overflow-hidden
                  ${isAdmin ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5'}`}>
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt={profile.full_name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <span className={`text-xs font-semibold uppercase ${isAdmin ? 'text-white' : 'text-[#a1a1aa]'}`}>
                      {(profile.full_name || profile.email)[0]}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {profile.full_name || '—'}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[9px] text-[#a1a1aa] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">vous</span>
                    )}
                    {isAdmin && (
                      <span className="text-[9px] font-medium text-white/60 bg-white/8 border border-white/15 px-1.5 py-0.5 rounded-full">Admin</span>
                    )}
                  </div>
                  <div className="text-xs text-[#52525b] mt-0.5">
                    {profile.email}
                    {profile.company && <span className="ml-2 text-[#3f3f46]">· {profile.company}</span>}
                  </div>
                </div>

                <select
                  defaultValue={profile.role}
                  onChange={e => handleRoleChange(profile.id, e.target.value as 'admin' | 'client')}
                  disabled={isCurrentUser || isPending}
                  className="bg-[#080808] border border-[#1e1e1e] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-white/30 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>

                <Link
                  href={`/admin/users/${profile.id}`}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                  title="Voir les projets"
                >
                  <FolderIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Projets</span>
                </Link>

                <button
                  onClick={() => setEditingId(isEditing ? null : profile.id)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer
                    ${isEditing
                      ? 'bg-white text-black border-white'
                      : 'text-[#a1a1aa] border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'}`}
                >
                  <EditIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Accès</span>
                </button>
              </div>

              {isEditing && (
                <div className="border-t border-[#1e1e1e] px-5 py-4 bg-[#080808]">
                  <div className="text-xs text-[#a1a1aa] mb-3 uppercase tracking-widest font-medium">Flows accessibles</div>
                  <div className="flex flex-wrap gap-2">
                    {flows.map((flow) => {
                      const hasAccess = userAccess.includes(flow.id)
                      return (
                        <button
                          key={flow.id}
                          onClick={() => handleToggleAccess(profile.id, flow.id, hasAccess)}
                          disabled={isPending}
                          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50
                            ${hasAccess
                              ? 'bg-white text-black border-white'
                              : 'bg-transparent text-[#a1a1aa] border-[#1e1e1e] hover:border-white/20 hover:text-white'
                            }`}
                        >
                          {hasAccess ? <CheckIcon className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                          {flow.name}
                        </button>
                      )
                    })}
                    {flows.length === 0 && <span className="text-[#a1a1aa] text-xs">Aucun flow disponible.</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

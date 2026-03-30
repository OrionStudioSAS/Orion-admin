'use client'

import { useState, useTransition } from 'react'
import { Profile, FlowAccess } from '@/types/database'
import { PlusIcon, EditIcon, CheckIcon, XIcon, KeyIcon } from '@/components/ui/Icons'
import { updateUserRole, grantFlowAccess, revokeFlowAccess } from '@/app/actions/users'

interface Props {
  profiles: Profile[]
  flows: { id: string; name: string }[]
  accessList: FlowAccess[]
  currentUserId: string
}

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
        <span className="text-sm text-[#71717a]">{profiles.length} utilisateur{profiles.length > 1 ? 's' : ''}</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-all"
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
              <label className="block text-[10px] text-[#71717a] uppercase tracking-widest mb-2">Nom complet</label>
              <input
                type="text"
                value={newUser.full_name}
                onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Jean Dupont"
                className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#71717a] uppercase tracking-widest mb-2">Email *</label>
              <input
                type="email"
                value={newUser.email}
                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                required
                placeholder="jean@exemple.com"
                className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#71717a] uppercase tracking-widest mb-2">Mot de passe *</label>
              <input
                type="password"
                value={newUser.password}
                onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#71717a] uppercase tracking-widest mb-2">Rôle</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser(p => ({ ...p, role: e.target.value as 'admin' | 'client' }))}
                className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-white/30 transition-colors"
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
              className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-5 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all"
            >
              <KeyIcon className="w-3.5 h-3.5" />
              {createLoading ? 'Création...' : 'Créer le compte'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-[#71717a] text-xs px-4 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {profiles.map((profile) => {
          const userAccess = getUserAccess(profile.id)
          const isEditing = editingId === profile.id
          const isCurrentUser = profile.id === currentUserId

          return (
            <div key={profile.id} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 md:gap-4 px-3 md:px-5 py-3 md:py-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-white uppercase">
                    {(profile.full_name || profile.email)[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">
                    {profile.full_name || '—'}
                    {isCurrentUser && <span className="ml-2 text-[10px] text-[#3f3f46]">(vous)</span>}
                  </div>
                  <div className="text-xs text-[#71717a]">
                    {profile.email}
                    {profile.company && <span className="ml-2 text-[#3f3f46]">· {profile.company}</span>}
                  </div>
                </div>

                <select
                  defaultValue={profile.role}
                  onChange={e => handleRoleChange(profile.id, e.target.value as 'admin' | 'client')}
                  disabled={isCurrentUser || isPending}
                  className="bg-[#080808] border border-[#1e1e1e] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-white/30 disabled:opacity-40 transition-colors"
                >
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>

                <button
                  onClick={() => setEditingId(isEditing ? null : profile.id)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all
                    ${isEditing ? 'bg-white text-black' : 'text-[#71717a] hover:text-white hover:bg-white/5'}`}
                >
                  <EditIcon className="w-3 h-3" />
                  Accès
                </button>
              </div>

              {isEditing && (
                <div className="border-t border-[#1e1e1e] px-5 py-4 bg-[#080808]">
                  <div className="text-xs text-[#71717a] mb-3 uppercase tracking-widest font-medium">Flows accessibles</div>
                  <div className="flex flex-wrap gap-2">
                    {flows.map((flow) => {
                      const hasAccess = userAccess.includes(flow.id)
                      return (
                        <button
                          key={flow.id}
                          onClick={() => handleToggleAccess(profile.id, flow.id, hasAccess)}
                          disabled={isPending}
                          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all
                            ${hasAccess
                              ? 'bg-white text-black border-white'
                              : 'bg-transparent text-[#71717a] border-[#1e1e1e] hover:border-white/20 hover:text-white'
                            }`}
                        >
                          {hasAccess ? <CheckIcon className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                          {flow.name}
                        </button>
                      )
                    })}
                    {flows.length === 0 && <span className="text-[#3f3f46] text-xs">Aucun flow disponible.</span>}
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

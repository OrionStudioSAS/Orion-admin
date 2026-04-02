'use client'

import { useState, useTransition } from 'react'
import { addTeamMember, removeTeamMember } from '@/app/actions/projects'
import { Profile } from '@/types/database'

interface TeamMember {
  id: string
  profile_id: string
  role_override: string | null
  profile: Profile
}

interface Props {
  projectId: string
  profileId: string
  admins: Profile[]
  allUsers: Profile[]
  teamMembers: TeamMember[]
}

export default function TeamSection({ projectId, profileId, admins, allUsers, teamMembers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [roleValue, setRoleValue] = useState('')
  const [showLinkUser, setShowLinkUser] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const memberIds = new Set(teamMembers.map(m => m.profile_id))

  // Admins toggle list
  function handleToggle(adminId: string, isInTeam: boolean) {
    startTransition(async () => {
      if (isInTeam) {
        await removeTeamMember(projectId, profileId, adminId)
      } else {
        await addTeamMember(projectId, profileId, adminId)
      }
    })
  }

  function handleRoleSave(memberId: string) {
    startTransition(async () => {
      await addTeamMember(projectId, profileId, memberId, roleValue || undefined)
      setEditingRole(null)
    })
  }

  function startEditRole(member: TeamMember) {
    setEditingRole(member.profile_id)
    setRoleValue(member.role_override || member.profile.job_title || '')
  }

  // Link existing user
  function handleLinkUser(userId: string) {
    startTransition(async () => {
      await addTeamMember(projectId, profileId, userId)
      setShowLinkUser(false)
      setSearchQuery('')
    })
  }

  // Filter non-admin users that aren't already team members
  const linkableUsers = allUsers.filter(u =>
    u.role !== 'admin' &&
    !memberIds.has(u.id) &&
    u.id !== profileId &&
    (searchQuery === '' ||
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.company || '').toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Équipe du projet</div>
          <div className="text-xs text-[#a1a1aa] mt-0.5">Sélectionnez les membres qui travaillent sur ce projet</div>
        </div>
        <button
          type="button"
          onClick={() => setShowLinkUser(p => !p)}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer
            ${showLinkUser ? 'bg-white text-black border-white' : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
        >
          {showLinkUser ? 'Fermer' : '+ Lier un utilisateur'}
        </button>
      </div>

      {/* Link existing user panel */}
      {showLinkUser && (
        <div className="px-5 py-4 border-b border-[#1e1e1e] bg-white/[0.02]">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, email ou entreprise..."
            autoFocus
            className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors mb-3"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {linkableUsers.length === 0 ? (
              <p className="text-xs text-[#52525b] text-center py-3">Aucun utilisateur trouvé</p>
            ) : (
              linkableUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar_url} alt={user.full_name || ''} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-semibold text-white uppercase">{(user.full_name || user.email)[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">{user.full_name || user.email}</div>
                      {user.company && <div className="text-[10px] text-[#a1a1aa] truncate">{user.company}</div>}
                      <div className="text-[10px] text-[#52525b] truncate">{user.email}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLinkUser(user.id)}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded-lg border text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20 font-medium transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Lier
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="p-4 space-y-2">
        {admins.map(admin => {
          const isInTeam = memberIds.has(admin.id)
          const member = teamMembers.find(m => m.profile_id === admin.id)
          const isEditing = editingRole === admin.id

          return (
            <div key={admin.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all
              ${isInTeam ? 'bg-white/3 border-white/10' : 'border-transparent'}`}>
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                {admin.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={admin.avatar_url} alt={admin.full_name || ''} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-white uppercase">{(admin.full_name || admin.email)[0]}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{admin.full_name || admin.email}</div>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={roleValue}
                      onChange={e => setRoleValue(e.target.value)}
                      placeholder="Rôle sur ce projet..."
                      autoFocus
                      className="flex-1 bg-[#080808] border border-white/20 text-white text-xs rounded-lg px-2 py-1 placeholder-[#3f3f46] focus:outline-none focus:border-white/40"
                    />
                    <button
                      type="button"
                      onClick={() => handleRoleSave(admin.id)}
                      disabled={isPending}
                      className="text-[10px] bg-white text-black px-2.5 py-1 rounded-lg font-semibold hover:bg-white/90 disabled:opacity-50 cursor-pointer"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRole(null)}
                      className="text-[10px] text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div>
                    {admin.job_title && (
                      <div className="text-[11px] text-[#a1a1aa]">{admin.job_title}</div>
                    )}
                    <div className="flex items-center gap-1.5">
                      {isInTeam && member?.role_override && (
                        <span className="text-[11px] text-blue-400">{member.role_override}</span>
                      )}
                      {isInTeam && (
                        <button
                          type="button"
                          onClick={() => startEditRole(member!)}
                          className="text-[10px] text-[#52525b] hover:text-[#a1a1aa] transition-colors cursor-pointer"
                          title="Modifier le rôle sur ce projet"
                        >
                          ✎
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {admin.company && (
                  <div className="text-[10px] text-[#52525b] mt-0.5">{admin.company}{admin.siret ? ` · SIRET ${admin.siret}` : ''}</div>
                )}
                {admin.company_address && (
                  <div className="text-[10px] text-[#52525b]">{admin.company_address}</div>
                )}
                {admin.email && (
                  <div className="text-[10px] text-[#52525b] mt-0.5">{admin.email}</div>
                )}
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => handleToggle(admin.id, isInTeam)}
                disabled={isPending}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer disabled:opacity-50
                  ${isInTeam
                    ? 'bg-white text-black border-white hover:bg-white/90'
                    : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
              >
                {isInTeam ? 'Retirer' : 'Ajouter'}
              </button>
            </div>
          )
        })}

        {/* Non-admin linked members */}
        {teamMembers.filter(m => !admins.some(a => a.id === m.profile_id)).map(member => {
          const isEditing = editingRole === member.profile_id
          return (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl border bg-white/3 border-white/10 transition-all">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                {member.profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.profile.avatar_url} alt={member.profile.full_name || ''} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-white uppercase">{(member.profile.full_name || member.profile.email)[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{member.profile.full_name || member.profile.email}</span>
                  <span className="text-[10px] text-[#52525b] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded">Client</span>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={roleValue}
                      onChange={e => setRoleValue(e.target.value)}
                      placeholder="Rôle sur ce projet..."
                      autoFocus
                      className="flex-1 bg-[#080808] border border-white/20 text-white text-xs rounded-lg px-2 py-1 placeholder-[#3f3f46] focus:outline-none focus:border-white/40"
                    />
                    <button type="button" onClick={() => handleRoleSave(member.profile_id)} disabled={isPending} className="text-[10px] bg-white text-black px-2.5 py-1 rounded-lg font-semibold hover:bg-white/90 disabled:opacity-50 cursor-pointer">OK</button>
                    <button type="button" onClick={() => setEditingRole(null)} className="text-[10px] text-[#a1a1aa] hover:text-white transition-colors cursor-pointer">Annuler</button>
                  </div>
                ) : (
                  <div>
                    {member.profile.job_title && <div className="text-[11px] text-[#a1a1aa]">{member.profile.job_title}</div>}
                    <div className="flex items-center gap-1.5">
                      {member.role_override && <span className="text-[11px] text-blue-400">{member.role_override}</span>}
                      <button type="button" onClick={() => startEditRole(member)} className="text-[10px] text-[#52525b] hover:text-[#a1a1aa] transition-colors cursor-pointer" title="Modifier le rôle">✎</button>
                    </div>
                  </div>
                )}
                {member.profile.company && (
                  <div className="text-[10px] text-[#52525b] mt-0.5">{member.profile.company}{member.profile.siret ? ` · SIRET ${member.profile.siret}` : ''}</div>
                )}
                {member.profile.company_address && (
                  <div className="text-[10px] text-[#52525b]">{member.profile.company_address}</div>
                )}
                <div className="text-[10px] text-[#52525b] mt-0.5">{member.profile.email}</div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(member.profile_id, true)}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-lg border bg-white text-black border-white hover:bg-white/90 font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                Retirer
              </button>
            </div>
          )
        })}

        {admins.length === 0 && (
          <p className="text-[#52525b] text-xs text-center py-4">Aucun admin disponible.</p>
        )}
      </div>
    </div>
  )
}

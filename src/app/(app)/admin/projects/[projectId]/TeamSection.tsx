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
  teamMembers: TeamMember[]
}

export default function TeamSection({ projectId, profileId, admins, teamMembers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [roleValue, setRoleValue] = useState('')

  const memberIds = new Set(teamMembers.map(m => m.profile_id))

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

  return (
    <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e1e1e]">
        <div className="text-sm font-semibold text-white">Équipe du projet</div>
        <div className="text-xs text-[#a1a1aa] mt-0.5">Sélectionnez les membres qui travaillent sur ce projet</div>
      </div>

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
        {admins.length === 0 && (
          <p className="text-[#52525b] text-xs text-center py-4">Aucun admin disponible.</p>
        )}
      </div>
    </div>
  )
}

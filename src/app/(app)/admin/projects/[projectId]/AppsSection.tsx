'use client'

import { useState, useTransition } from 'react'
import { addProjectApp, removeProjectApp, createApp, deleteApp, uploadAppLogo } from '@/app/actions/projects'
import { App } from '@/types/database'
import { PlusIcon, TrashIcon } from '@/components/ui/Icons'

interface Props {
  projectId: string
  profileId: string
  allApps: App[]
  projectAppIds: string[]
}

export default function AppsSection({ projectId, profileId, allApps, projectAppIds }: Props) {
  const [isPending, startTransition] = useTransition()
  const [addingApp, setAddingApp] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creatingLoading, setCreatingLoading] = useState(false)
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null)

  const selectedIds = new Set(projectAppIds)

  function handleToggle(appId: string, isSelected: boolean) {
    startTransition(async () => {
      if (isSelected) {
        await removeProjectApp(projectId, profileId, appId)
      } else {
        await addProjectApp(projectId, profileId, appId)
      }
    })
  }

  async function handleCreateApp() {
    if (!newName.trim()) return
    setCreatingLoading(true)
    try {
      await createApp(newName.trim(), newDesc.trim() || undefined)
      setNewName('')
      setNewDesc('')
      setAddingApp(false)
    } catch {
      // silently fail
    }
    setCreatingLoading(false)
  }

  async function handleDeleteApp(appId: string) {
    if (!confirm('Supprimer cette app du catalogue ?')) return
    startTransition(async () => {
      await deleteApp(appId)
    })
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>, appId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogoId(appId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('appId', appId)
      await uploadAppLogo(fd)
    } catch {
      // silently fail
    }
    setUploadingLogoId(null)
  }

  return (
    <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
        <div>
          <div className="text-sm font-semibold text-white">Apps</div>
          <div className="text-xs text-[#a1a1aa] mt-0.5">Outils et intégrations du projet</div>
        </div>
        <button
          type="button"
          onClick={() => setAddingApp(a => !a)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer
            ${addingApp ? 'bg-white text-black border-white' : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
        >
          <PlusIcon className="w-3 h-3" />
          Nouvelle app
        </button>
      </div>

      {/* Add new app form */}
      {addingApp && (
        <div className="px-5 py-4 bg-[#080808]/50 border-b border-[#1e1e1e]">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nom de l'app (ex: Stripe, n8n, HubSpot)"
              autoFocus
              className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
            />
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optionnel)"
              className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateApp}
                disabled={creatingLoading || !newName.trim()}
                className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
              >
                {creatingLoading ? 'Création...' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={() => setAddingApp(false)}
                className="text-[#a1a1aa] text-xs px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apps list */}
      {allApps.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[#52525b] text-xs">Aucune app dans le catalogue. Créez-en une ci-dessus.</p>
        </div>
      ) : (
        <div className="p-4 flex flex-wrap gap-2">
          {allApps.map(app => {
            const isSelected = selectedIds.has(app.id)
            return (
              <div
                key={app.id}
                className={`flex items-center gap-2.5 pl-2 pr-1 py-1.5 rounded-xl border transition-all
                  ${isSelected ? 'bg-white/5 border-white/15' : 'border-[#1e1e1e]'}`}
              >
                {/* Logo or placeholder */}
                <label className="relative w-7 h-7 rounded-lg overflow-hidden bg-white/5 border border-white/5 flex items-center justify-center shrink-0 cursor-pointer group" title="Changer le logo">
                  {app.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.logo_url} alt={app.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] font-bold text-[#a1a1aa]">{app.name[0]}</span>
                  )}
                  {uploadingLogoId === app.id && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, app.id)} />
                </label>

                <div className="min-w-0">
                  <div className="text-xs font-medium text-white">{app.name}</div>
                  {app.description && <div className="text-[10px] text-[#52525b] truncate max-w-[120px]">{app.description}</div>}
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(app.id, isSelected)}
                  disabled={isPending}
                  className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition-all cursor-pointer disabled:opacity-50 shrink-0
                    ${isSelected
                      ? 'bg-white text-black border-white hover:bg-white/90'
                      : 'text-[#a1a1aa] border-[#1e1e1e] hover:text-white hover:border-white/20'}`}
                >
                  {isSelected ? '✓' : '+'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteApp(app.id)}
                  disabled={isPending}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-[#3f3f46] hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-50"
                  title="Supprimer du catalogue"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

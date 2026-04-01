'use client'

import { useState, useTransition, useRef } from 'react'
import { updateProfile, changePassword, uploadAvatar } from '@/app/actions/profile'
import { Profile } from '@/types/database'
import { CheckIcon, ShieldIcon } from '@/components/ui/Icons'

interface Props {
  profile: Profile
}

const inputClass = "w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-3 py-2.5 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
const labelClass = "block text-[10px] text-[#a1a1aa] uppercase tracking-widest mb-2"

export default function ProfileForm({ profile }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  // Password change
  const [pwdForm, setPwdForm] = useState({ newPwd: '', confirmPwd: '' })
  const [pwdPending, startPwdTransition] = useTransition()
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function handlePwdSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pwdForm.newPwd !== pwdForm.confirmPwd) {
      setPwdMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (pwdForm.newPwd.length < 8) {
      setPwdMsg({ type: 'err', text: '8 caractères minimum.' })
      return
    }
    startPwdTransition(async () => {
      try {
        await changePassword(pwdForm.newPwd)
        setPwdMsg({ type: 'ok', text: 'Mot de passe mis à jour.' })
        setPwdForm({ newPwd: '', confirmPwd: '' })
      } catch (err) {
        setPwdMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erreur' })
      }
    })
  }
  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    job_title: profile.job_title || '',
    linkedin_url: profile.linkedin_url || '',
    company: profile.company || '',
    website: profile.website || '',
    webflow_site: profile.webflow_site || '',
    phone: profile.phone || '',
  })

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const url = await uploadAvatar(fd)
      setAvatarUrl(url)
    } catch {
      // silently fail
    }
    setAvatarLoading(false)
  }

  function handleChange(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
      setSaved(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        await updateProfile({ ...form, avatar_url: avatarUrl || null })
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identité */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4 md:p-6">
        <h2 className="text-xs font-semibold text-white uppercase tracking-widest mb-5">Identité</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-semibold text-white uppercase">
                  {(profile.full_name || profile.email)[0]}
                </span>
              )}
            </div>
            {avatarLoading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-3 py-2 rounded-lg cursor-pointer transition-all">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round"/><polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/></svg>
              Changer la photo
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
            <p className="text-[10px] text-[#52525b] mt-1">JPG, PNG, WebP — max 5 MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nom complet</label>
            <input
              type="text"
              value={form.full_name}
              onChange={handleChange('full_name')}
              placeholder="Jean Dupont"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Métier</label>
            <input
              type="text"
              value={form.job_title}
              onChange={handleChange('job_title')}
              placeholder="Co-fondateur, CEO, Designer..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>LinkedIn</label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={handleChange('linkedin_url')}
              placeholder="https://linkedin.com/in/..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={handleChange('phone')}
              placeholder="+33 6 00 00 00 00"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className={`${inputClass} opacity-40 cursor-not-allowed`}
            />
          </div>
        </div>
      </div>

      {/* Entreprise */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4 md:p-6">
        <h2 className="text-xs font-semibold text-white uppercase tracking-widest mb-5">Entreprise</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Société</label>
            <input
              type="text"
              value={form.company}
              onChange={handleChange('company')}
              placeholder="Acme Inc."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Site web</label>
            <input
              type="url"
              value={form.website}
              onChange={handleChange('website')}
              placeholder="https://monsite.fr"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Site Webflow</label>
            <input
              type="url"
              value={form.webflow_site}
              onChange={handleChange('webflow_site')}
              placeholder="https://monsite.webflow.io"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all"
        >
          {saved ? <CheckIcon className="w-3.5 h-3.5" /> : null}
          {isPending ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
        <span className="text-[#a1a1aa] text-xs">
          {profile.role === 'admin' ? 'Admin' : 'Client'}
        </span>
      </div>

      {/* Sécurité */}
      <form onSubmit={handlePwdSubmit} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <ShieldIcon className="w-4 h-4 text-[#a1a1aa]" />
          <h2 className="text-xs font-semibold text-white uppercase tracking-widest">Changer le mot de passe</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Nouveau mot de passe</label>
            <input
              type="password"
              value={pwdForm.newPwd}
              onChange={e => { setPwdForm(p => ({ ...p, newPwd: e.target.value })); setPwdMsg(null) }}
              placeholder="8 caractères minimum"
              minLength={8}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Confirmer le mot de passe</label>
            <input
              type="password"
              value={pwdForm.confirmPwd}
              onChange={e => { setPwdForm(p => ({ ...p, confirmPwd: e.target.value })); setPwdMsg(null) }}
              placeholder="Répétez le mot de passe"
              minLength={8}
              required
              className={inputClass}
            />
          </div>
        </div>
        {pwdMsg && (
          <p className={`text-xs mb-3 ${pwdMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{pwdMsg.text}</p>
        )}
        <button
          type="submit"
          disabled={pwdPending || !pwdForm.newPwd || !pwdForm.confirmPwd}
          className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all"
        >
          {pwdPending ? 'Mise à jour...' : 'Mettre à jour'}
        </button>
      </form>
    </form>
  )
}

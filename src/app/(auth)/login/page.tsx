'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoIcon, StarIcon } from '@/components/ui/Icons'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-[#080808] flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 border-r border-[#1e1e1e] overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f0f] via-[#080808] to-[#080808]" />
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white/[0.02] blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white/[0.02] blur-3xl translate-x-1/2 translate-y-1/2" />

        {/* Stars decorative */}
        <div className="absolute top-1/3 left-1/4 text-white/10">
          <StarIcon className="w-3 h-3" />
        </div>
        <div className="absolute top-2/3 right-1/4 text-white/10">
          <StarIcon className="w-2 h-2" />
        </div>
        <div className="absolute top-1/2 right-1/3 text-white/5">
          <StarIcon className="w-4 h-4" />
        </div>

        <div className="relative flex items-center gap-3">
          <LogoIcon className="w-8 h-8" />
          <span className="text-white font-semibold tracking-wide">Orion Studio</span>
        </div>

        <div className="relative">
          <div className="text-[#a1a1aa] text-xs tracking-widest uppercase mb-6 font-medium">Votre espace client</div>
          <h1 className="text-4xl font-light text-white leading-tight mb-4">
            Pilotez vos<br />
            <span className="font-semibold">projets &amp; automatisations</span><br />
            en un seul endroit
          </h1>
          <p className="text-[#a1a1aa] text-sm leading-relaxed max-w-xs">
            Suivi de projet, fichiers, factures, automatisations et communication — tout centralisé dans votre dashboard Orion Studio.
          </p>
        </div>

        <div className="relative flex items-center gap-4">
          <div className="flex -space-x-2">
            {['O', 'A', 'C'].map((l, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-[10px] font-medium text-[#a1a1aa]">
                {l}
              </div>
            ))}
          </div>
          <span className="text-[#a1a1aa] text-xs">Accès réservé — clients & équipe Orion</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-12">
            <LogoIcon className="w-7 h-7" />
            <span className="text-white font-semibold">Orion Studio</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">Connexion</h2>
            <p className="text-[#a1a1aa] text-sm">Accédez à votre espace de gestion</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-2 tracking-wide uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vous@exemple.com"
                className="w-full bg-[#0f0f0f] border border-[#1e1e1e] text-white text-sm rounded-lg px-4 py-3 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 focus:bg-[#0f0f0f] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-2 tracking-wide uppercase">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0f0f0f] border border-[#1e1e1e] text-white text-sm rounded-lg px-4 py-3 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              suppressHydrationWarning
              className="w-full bg-white text-black text-sm font-semibold rounded-lg py-3 mt-2 hover:bg-white/90 active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-[#a1a1aa] text-xs text-center mt-8">
            Accès sur invitation uniquement.<br />
            Contactez votre administrateur.
          </p>
        </div>
      </div>
    </div>
  )
}

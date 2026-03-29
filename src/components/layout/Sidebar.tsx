'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { LogoIcon, GridIcon, HistoryIcon, UsersIcon, BoltIcon, LogOutIcon, StarIcon } from '@/components/ui/Icons'

interface SidebarProps {
  profile: Profile
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isAdmin = profile.role === 'admin'

  const navItems = [
    { href: '/dashboard', icon: GridIcon, label: 'Flows' },
    { href: '/history', icon: HistoryIcon, label: 'Historique' },
    ...(isAdmin ? [{ href: '/admin', icon: UsersIcon, label: 'Admin' }] : []),
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col border-r border-[#1e1e1e] bg-[#080808] z-10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[#1e1e1e]">
        <LogoIcon className="w-7 h-7 shrink-0" />
        <div>
          <div className="text-sm font-semibold tracking-wide text-white">Orion Studio</div>
          <div className="text-[11px] text-[#71717a] mt-0.5">Automations</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3">
        <div className="mb-1 px-3 pb-2">
          <span className="text-[10px] font-medium tracking-widest text-[#3f3f46] uppercase">Navigation</span>
        </div>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all duration-150 group
                ${active
                  ? 'bg-white text-black font-medium'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {active && <StarIcon className="ml-auto w-2 h-2 text-black/40" />}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-[#1e1e1e] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-white uppercase">
              {(profile.full_name || profile.email)[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {profile.full_name || 'Utilisateur'}
            </div>
            <div className="text-[11px] text-[#71717a] truncate">{profile.email}</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium tracking-wider uppercase
            ${isAdmin
              ? 'border-white/20 text-white/60 bg-white/5'
              : 'border-[#1e1e1e] text-[#71717a]'
            }`}>
            {isAdmin ? 'Admin' : 'Client'}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-[#71717a] hover:text-white text-xs transition-colors"
          >
            <LogOutIcon className="w-3.5 h-3.5" />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  )
}

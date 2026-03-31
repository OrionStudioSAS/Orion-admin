'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { LogoIcon, GridIcon, HistoryIcon, UsersIcon, LogOutIcon, StarIcon, XIcon, UserCircleIcon, MessageIcon, FolderIcon } from '@/components/ui/Icons'

interface SidebarProps {
  profile: Profile
  pendingRequestsCount?: number
  unreadMessagesCount?: number
}

function MenuIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
    </svg>
  )
}

export default function Sidebar({ profile, pendingRequestsCount = 0, unreadMessagesCount = 0 }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = profile.role === 'admin'

  const navItems = [
    { href: '/dashboard', icon: GridIcon, label: 'Flows' },
    ...(!isAdmin ? [{ href: '/project', icon: FolderIcon, label: 'Mon projet' }] : []),
    { href: '/history', icon: HistoryIcon, label: 'Historique' },
    {
      href: isAdmin ? '/admin/chat' : '/chat',
      icon: MessageIcon,
      label: 'Messages',
      badge: unreadMessagesCount,
    },
    ...(isAdmin ? [{ href: '/admin', icon: UsersIcon, label: 'Admin', badge: pendingRequestsCount }] : []),
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <LogoIcon className="w-7 h-7 shrink-0" />
          <div>
            <div className="text-sm font-semibold tracking-wide text-white">Orion Studio</div>
            <div className="text-[11px] text-[#71717a] mt-0.5">Automations</div>
          </div>
        </div>
        {/* Close button mobile */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 transition-all"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3">
        <div className="mb-1 px-3 pb-2">
          <span className="text-[10px] font-medium tracking-widest text-[#3f3f46] uppercase">Navigation</span>
        </div>
        {navItems.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname === href || (
            href !== '/admin'
              ? pathname.startsWith(href + '/')
              : pathname.startsWith('/admin/') && !pathname.startsWith('/admin/chat')
          )
          const hasBadge = badge && badge > 0
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all duration-150 group
                ${active
                  ? 'bg-white text-black font-medium'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && !hasBadge && <StarIcon className="w-2 h-2 text-black/40" />}
              {hasBadge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                  ${active ? 'bg-black/20 text-black' : 'bg-white text-black'}`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-[#1e1e1e] p-4">
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 mb-3 group"
        >
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
            <span className="text-xs font-semibold text-white uppercase">
              {(profile.full_name || profile.email)[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate group-hover:text-white/80 transition-colors">
              {profile.full_name || 'Utilisateur'}
            </div>
            <div className="text-[11px] text-[#71717a] truncate">{profile.email}</div>
          </div>
          <UserCircleIcon className="w-3.5 h-3.5 text-[#3f3f46] group-hover:text-[#71717a] transition-colors shrink-0" />
        </Link>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium tracking-wider uppercase
            ${isAdmin ? 'border-white/20 text-white/60 bg-white/5' : 'border-[#1e1e1e] text-[#71717a]'}`}>
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
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 bg-[#080808] border-b border-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <LogoIcon className="w-6 h-6" />
          <span className="text-sm font-semibold text-white">Orion Studio</span>
        </div>
        <div className="flex items-center gap-2">
          {unreadMessagesCount > 0 && (
            <span className="text-[9px] font-bold bg-white text-black px-1.5 py-0.5 rounded-full">
              {unreadMessagesCount}
            </span>
          )}
          <button
            onClick={() => setOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 transition-all"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overlay mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 flex-col border-r border-[#1e1e1e] bg-[#080808] z-10">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile drawer */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full w-72 flex flex-col border-r border-[#1e1e1e] bg-[#080808] z-40 transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>
    </>
  )
}

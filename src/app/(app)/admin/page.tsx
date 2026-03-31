import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UsersIcon, BoltIcon, HistoryIcon, ArrowRightIcon, StarIcon } from '@/components/ui/Icons'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ count: usersCount }, { count: flowsCount }, { count: execCount }] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('flows').select('*', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('flow_executions').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Utilisateurs', value: usersCount ?? 0, icon: UsersIcon, href: '/admin/users' },
    { label: 'Flows actifs', value: flowsCount ?? 0, icon: BoltIcon, href: '/admin/flows' },
    { label: 'Exécutions', value: execCount ?? 0, icon: HistoryIcon, href: '/history' },
  ]

  const sections = [
    { href: '/admin/users', icon: UsersIcon, title: 'Gestion des utilisateurs', description: 'Créer des comptes, définir les rôles, assigner les flows aux clients.' },
    { href: '/admin/flows', icon: BoltIcon, title: 'Gestion des flows', description: 'Ajouter, éditer ou désactiver des flows N8N. Configurer les webhooks et les formulaires.' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Administration</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Panneau d'admin</h1>
        <p className="text-[#a1a1aa] text-sm mt-2">Vue d'ensemble et gestion de la plateforme</p>
      </div>

      {/* Stats — 1 col mobile, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}
            className="group bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4 md:p-5 hover:border-white/20 hover:bg-[#141414] transition-all flex sm:flex-col items-center sm:items-start gap-4 sm:gap-0"
          >
            <div className="flex sm:w-full items-center justify-between sm:mb-3">
              <Icon className="w-4 h-4 text-[#a1a1aa] group-hover:text-white transition-colors" />
              <ArrowRightIcon className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-[#a1a1aa] transition-colors hidden sm:block" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">{value}</div>
              <div className="text-xs text-[#a1a1aa] mt-0.5">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}
            className="group flex flex-col bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 md:p-6 hover:border-white/20 hover:bg-[#141414] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 md:mb-5 group-hover:bg-white/10 transition-colors">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
            <p className="text-[#a1a1aa] text-xs leading-relaxed mb-4 md:mb-5 flex-1">{description}</p>
            <div className="flex items-center gap-2 text-xs text-[#a1a1aa] group-hover:text-white transition-colors">
              <span>Gérer</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

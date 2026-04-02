import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon } from '@/components/ui/Icons'
import OverviewCharts from './OverviewCharts'

export default async function OverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch invoices with project info for revenue charts
  const { data: allFiles } = await admin
    .from('project_files')
    .select('id, category, amount_ht, is_paid, created_at, project_id')
    .eq('category', 'invoice')

  // Fetch projects for plan_type grouping
  const { data: projects } = await admin
    .from('projects')
    .select('id, plan_type, status')

  // Fetch prospects for funnel
  const { data: prospects } = await admin
    .from('prospects')
    .select('id, status, channel, company_name, contact_name, email, updated_at')

  // Build revenue data: paid invoices by month (last 12 months)
  const now = new Date()
  const months: { key: string; label: string; year: number; month: number }[] = []
  const monthLabels = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: monthLabels[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }

  const paidInvoices = (allFiles || []).filter(f => f.is_paid && f.amount_ht)
  const revenueData = months.map(m => {
    const monthInvoices = paidInvoices.filter(f => {
      const d = new Date(f.created_at)
      return d.getFullYear() === m.year && d.getMonth() === m.month
    })
    const ttc = monthInvoices.reduce((sum, f) => sum + (f.amount_ht || 0), 0)
    return {
      label: m.label,
      ttc,
      ht: Math.round(ttc / 1.20 * 100) / 100,
      count: monthInvoices.length,
    }
  })

  // Auto-expire: prospects "relancé" > 1 week → "perdu"
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  await admin
    .from('prospects')
    .update({ status: 'perdu', updated_at: new Date().toISOString() })
    .eq('status', 'relance')
    .lt('updated_at', oneWeekAgo)

  // Build funnel data
  const allProspects = (prospects || []).filter(p => p.status !== 'perdu')
  const statusOrder = ['nouveau', 'contacte', 'relance', 'en_discussion', 'rdv_pris', 'converti']
  const atLeast = (status: string) => {
    const idx = statusOrder.indexOf(status)
    return allProspects.filter(p => statusOrder.indexOf(p.status) >= idx).length
  }
  const funnelData = [
    { label: 'Prospects', value: allProspects.length },
    { label: 'Contactés', value: atLeast('contacte') },
    { label: 'Relancés', value: allProspects.filter(p => p.status === 'relance').length },
    { label: 'Intéressés', value: atLeast('en_discussion') },
    { label: 'RDV pris', value: atLeast('rdv_pris') },
    { label: 'Clients', value: atLeast('converti') },
  ]

  // Build CA by type (donut)
  const projectMap = new Map((projects || []).map(p => [p.id, p.plan_type]))
  const typeGroups: Record<string, number> = {}
  for (const inv of paidInvoices) {
    const planType = projectMap.get(inv.project_id) || 'autre'
    let group = 'Autre'
    if (planType.includes('webflow')) group = 'Webflow'
    else if (planType.includes('shopify')) group = 'Shopify'
    else if (planType === 'automation') group = 'Automation'
    else if (planType === 'design') group = 'Design'
    else if (planType === 'maintenance') group = 'Maintenance'
    typeGroups[group] = (typeGroups[group] || 0) + (inv.amount_ht || 0)
  }
  const donutData = Object.entries(typeGroups).map(([name, value]) => ({ name, value }))

  // Total revenue
  const totalRevenueTTC = paidInvoices.reduce((s, f) => s + (f.amount_ht || 0), 0)
  const totalRevenueHT = Math.round(totalRevenueTTC / 1.20 * 100) / 100
  const totalInvoices = paidInvoices.length
  const totalProspects = (prospects || []).length
  const allP = prospects || []
  const emailToContact = allP.filter(p => (p.channel === 'email' || !p.channel) && p.status === 'nouveau').length
  const coldCallToContact = allP.filter(p => p.channel === 'cold_call' && p.status === 'nouveau').length
  const convertedCount = allP.filter(p => p.status === 'converti').length
  const conversionRate = totalProspects > 0
    ? Math.round(convertedCount / totalProspects * 100)
    : 0

  // Prospects needing attention: contacté > 1 week
  const staleContacted = allP.filter(p =>
    p.status === 'contacte' && p.updated_at < oneWeekAgo
  )

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Administration</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Overview</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4">
          <div className="text-[10px] text-[#a1a1aa] uppercase tracking-widest mb-2">Revenus</div>
          <div className="text-2xl font-semibold text-white">{(totalRevenueTTC / 1000).toFixed(1)}k€ <span className="text-sm font-medium text-[#a1a1aa]">TTC</span></div>
          <div className="text-sm font-semibold text-[#a1a1aa] mt-1">{(totalRevenueHT / 1000).toFixed(1)}k€ <span className="text-xs font-medium text-[#52525b]">HT</span></div>
        </div>
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4">
          <div className="text-[10px] text-[#a1a1aa] uppercase tracking-widest mb-2">Prospection</div>
          <div className="flex items-baseline gap-3">
            <div className="text-2xl font-semibold text-white">{totalProspects}</div>
            <span className="text-[10px] text-[#52525b]">total</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-xs text-[#a1a1aa]">{emailToContact} email{emailToContact > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span className="text-xs text-[#a1a1aa]">{coldCallToContact} cold call{coldCallToContact > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="text-[10px] text-[#52525b] mt-1">à contacter</div>
        </div>
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4">
          <div className="text-[10px] text-[#a1a1aa] uppercase tracking-widest mb-2">Conversion</div>
          <div className="text-2xl font-semibold text-green-400">{conversionRate}%</div>
          <div className="text-sm text-[#a1a1aa] mt-1">{convertedCount} converti{convertedCount > 1 ? 's' : ''} <span className="text-[#52525b]">/ {totalProspects}</span></div>
        </div>
      </div>

      {/* Alerts: prospects needing follow-up */}
      {staleContacted.length > 0 && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/></svg>
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest">À relancer</span>
            <span className="text-[10px] text-orange-400/60 bg-orange-500/10 px-2 py-0.5 rounded-full">{staleContacted.length} prospect{staleContacted.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {staleContacted.map(p => {
              const daysSince = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24))
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 bg-[#0f0f0f] rounded-xl px-4 py-2.5 border border-[#1e1e1e]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-white">{p.company_name}</span>
                    {p.contact_name && <span className="text-xs text-[#a1a1aa]">{p.contact_name}</span>}
                    {p.email && <span className="text-xs text-[#52525b]">{p.email}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-orange-400">Contacté il y a {daysSince} jour{daysSince > 1 ? 's' : ''}</span>
                    <a href="/admin/prospection" className="text-[10px] font-semibold text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-lg hover:bg-cyan-500/10 transition-all">
                      Relancer →
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <OverviewCharts
        revenueData={revenueData}
        funnelData={funnelData}
        donutData={donutData}
      />
    </div>
  )
}

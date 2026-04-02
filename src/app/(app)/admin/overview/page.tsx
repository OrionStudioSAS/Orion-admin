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
    .select('id, status')

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

  // Build funnel data
  const allProspects = (prospects || []).filter(p => p.status !== 'perdu')
  const statusOrder = ['nouveau', 'contacte', 'en_discussion', 'rdv_pris', 'converti']
  const atLeast = (status: string) => {
    const idx = statusOrder.indexOf(status)
    return allProspects.filter(p => statusOrder.indexOf(p.status) >= idx).length
  }
  const funnelData = [
    { label: 'Prospects', value: allProspects.length },
    { label: 'Appelés', value: atLeast('contacte') },
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
  const conversionRate = totalProspects > 0
    ? Math.round((prospects || []).filter(p => p.status === 'converti').length / totalProspects * 100)
    : 0

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Revenus TTC', value: `${(totalRevenueTTC / 1000).toFixed(1)}k€`, color: 'text-white' },
          { label: 'Revenus HT', value: `${(totalRevenueHT / 1000).toFixed(1)}k€`, color: 'text-white' },
          { label: 'Prospects', value: String(totalProspects), color: 'text-white' },
          { label: 'Taux de conversion', value: `${conversionRate}%`, color: 'text-green-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4">
            <div className="text-[10px] text-[#a1a1aa] uppercase tracking-widest mb-2">{kpi.label}</div>
            <div className={`text-2xl font-semibold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <OverviewCharts
        revenueData={revenueData}
        funnelData={funnelData}
        donutData={donutData}
      />
    </div>
  )
}

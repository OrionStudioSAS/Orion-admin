'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface RevenueItem { label: string; amount: number; count: number }
interface FunnelItem { label: string; value: number }
interface DonutItem { name: string; value: number }

interface Props {
  revenueData: RevenueItem[]
  funnelData: FunnelItem[]
  donutData: DonutItem[]
}

const DONUT_COLORS: Record<string, string> = {
  Webflow: '#3B82F6',
  Shopify: '#10B981',
  Automation: '#F59E0B',
  Design: '#8B5CF6',
  Maintenance: '#EC4899',
  Autre: '#6B7280',
}

function formatK(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k€`
  return `${v}€`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload as RevenueItem
  return (
    <div className="bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs">
      <div className="text-white font-semibold mb-0.5">{label}</div>
      <div className="text-[#a1a1aa]">{d.amount.toLocaleString('fr-FR')} € HT</div>
      <div className="text-[#52525b]">{d.count} facture{d.count > 1 ? 's' : ''}</div>
    </div>
  )
}

export default function OverviewCharts({ revenueData, funnelData, donutData }: Props) {
  const currentMonth = revenueData.length - 1

  return (
    <div className="space-y-6">

      {/* Graphique 1 — Revenus 12 mois */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5">
        <div className="text-sm font-semibold text-white mb-1">Revenus 12 mois</div>
        <div className="text-[10px] text-[#52525b] uppercase tracking-widest mb-4">Factures payées — montant HT</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatK} width={45} />
              <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {revenueData.map((_, i) => (
                  <Cell key={i} fill={i === currentMonth ? '#C0392B' : '#333333'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Graphique 2 — Funnel de conversion */}
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5">
          <div className="text-sm font-semibold text-white mb-1">Funnel de conversion</div>
          <div className="text-[10px] text-[#52525b] uppercase tracking-widest mb-5">Parcours prospect → client</div>
          <div className="space-y-2">
            {funnelData.map((step, i) => {
              const maxVal = funnelData[0].value || 1
              const pct = Math.round((step.value / maxVal) * 100)
              const convRate = i > 0 && funnelData[i - 1].value > 0
                ? Math.round((step.value / funnelData[i - 1].value) * 100)
                : null

              const colors = [
                'bg-white/10',
                'bg-blue-500/20',
                'bg-purple-500/20',
                'bg-orange-500/20',
                'bg-green-500/20',
              ]

              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white font-medium">{step.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white font-semibold">{step.value}</span>
                      {convRate !== null && (
                        <span className="text-[10px] text-[#52525b]">({convRate}%)</span>
                      )}
                    </div>
                  </div>
                  <div className="h-6 bg-[#1e1e1e] rounded-lg overflow-hidden">
                    <div
                      className={`h-full rounded-lg transition-all ${colors[i]}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Graphique 3 — Répartition CA par type */}
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5">
          <div className="text-sm font-semibold text-white mb-1">Répartition CA par type</div>
          <div className="text-[10px] text-[#52525b] uppercase tracking-widest mb-4">Revenus par catégorie de projet</div>
          {donutData.length === 0 ? (
            <div className="h-52 flex items-center justify-center">
              <span className="text-xs text-[#52525b]">Aucune donnée de revenus</span>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={DONUT_COLORS[entry.name] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} € HT`, '']}
                    contentStyle={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: 'white' }}
                    itemStyle={{ color: '#a1a1aa' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => <span className="text-[11px] text-[#a1a1aa]">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

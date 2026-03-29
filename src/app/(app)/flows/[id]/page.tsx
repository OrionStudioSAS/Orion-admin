import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FlowForm from './FlowForm'
import { FlowIcon, StarIcon } from '@/components/ui/Icons'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FlowPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Check access
  const { data: flow } = await supabase
    .from('flows')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!flow) notFound()

  // Clients must have explicit access
  if (profile?.role !== 'admin') {
    const { data: access } = await supabase
      .from('flow_access')
      .select('id')
      .eq('flow_id', id)
      .eq('profile_id', user.id)
      .single()
    if (!access) notFound()
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-xs text-[#3f3f46]">
        <span>Flows</span>
        <span>/</span>
        <span className="text-[#71717a]">{flow.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <FlowIcon icon={flow.icon} className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            {flow.category && (
              <span className="text-[10px] text-[#3f3f46] uppercase tracking-widest font-medium">
                {flow.category}
              </span>
            )}
            <StarIcon className="w-2 h-2 text-[#3f3f46]" />
          </div>
          <h1 className="text-2xl font-semibold text-white">{flow.name}</h1>
          {flow.description && (
            <p className="text-[#71717a] text-sm mt-1">{flow.description}</p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-6">
        <div className="mb-6">
          <h2 className="text-sm font-medium text-white mb-1">Paramètres</h2>
          <p className="text-[#71717a] text-xs">Remplissez les champs ci-dessous pour déclencher le workflow.</p>
        </div>
        <FlowForm flow={flow} userId={user.id} />
      </div>
    </div>
  )
}

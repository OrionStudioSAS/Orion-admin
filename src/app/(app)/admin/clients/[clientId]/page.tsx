import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon } from '@/components/ui/Icons'
import { Project, ProjectFile } from '@/types/database'
import ClientView from './ClientView'

interface Props {
  params: Promise<{ clientId: string }>
}

export default async function AdminClientDetailPage({ params }: Props) {
  const { clientId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: client } = await admin.from('profiles').select('*').eq('id', clientId).single()
  if (!client || client.role !== 'client') notFound()

  const { data: project } = await admin
    .from('projects')
    .select('*, project_files(*)')
    .eq('profile_id', clientId)
    .single()

  const projectFiles: ProjectFile[] = project?.project_files || []

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#a1a1aa] mb-6">
        <Link href="/admin/clients" className="hover:text-white transition-colors">Clients</Link>
        <span>/</span>
        <span className="text-white">{client.company || client.full_name || client.email}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Administration</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white">
              {client.company || client.full_name || client.email}
            </h1>
            {client.company && client.full_name && (
              <p className="text-[#a1a1aa] text-sm mt-1">{client.full_name} · {client.email}</p>
            )}
            {!client.company && (
              <p className="text-[#a1a1aa] text-sm mt-1">{client.email}</p>
            )}
          </div>
          <Link
            href="/admin/clients"
            className="text-xs text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-4 py-2 rounded-lg transition-all"
          >
            ← Retour
          </Link>
        </div>
      </div>

      <ClientView
        client={client}
        project={project as Project | null}
        projectFiles={projectFiles}
      />
    </div>
  )
}

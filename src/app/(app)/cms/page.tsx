import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon } from '@/components/ui/Icons'
import { getClientSite } from '@/app/actions/cms'
import ClientCmsPanel from './ClientCmsPanel'

export default async function ClientCmsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin') redirect('/admin/cms')

  const site = await getClientSite()

  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem)] lg:h-screen p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-5 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Mon site</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Contenu</h1>
        <p className="text-[#a1a1aa] text-sm mt-1">Modifiez les textes et images de votre site</p>
      </div>

      {!site ? (
        <div className="flex-1 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-[#a1a1aa] text-sm">Aucun site configuré</p>
            <p className="text-[#52525b] text-xs mt-1">Contactez l&apos;équipe pour lier votre site.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden flex flex-col min-h-0">
          <ClientCmsPanel site={site} />
        </div>
      )}
    </div>
  )
}

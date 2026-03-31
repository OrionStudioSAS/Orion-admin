import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon } from '@/components/ui/Icons'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Compte</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Mon profil</h1>
        <p className="text-[#a1a1aa] text-sm mt-2">Gérez vos informations personnelles</p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  )
}

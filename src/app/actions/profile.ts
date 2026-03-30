'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateProfile(data: {
  full_name?: string
  company?: string
  website?: string
  webflow_site?: string
  phone?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/profile')
}

export async function cancelAccessRequest(flowId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const admin = createAdminClient()
  await admin
    .from('access_requests')
    .delete()
    .eq('profile_id', user.id)
    .eq('flow_id', flowId)
    .eq('status', 'pending')

  revalidatePath('/dashboard')
}

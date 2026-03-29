'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function logExecution(data: {
  flow_id: string
  status: 'success' | 'error'
  payload: Record<string, unknown>
  response: unknown
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const admin = createAdminClient()
  const { error } = await admin.from('flow_executions').insert({
    flow_id: data.flow_id,
    profile_id: user.id,
    status: data.status,
    payload: data.payload,
    response: data.response as Record<string, unknown>,
  })
  if (error) throw new Error(error.message)
}

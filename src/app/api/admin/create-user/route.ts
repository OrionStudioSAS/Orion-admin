import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Verify requester is authenticated
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Check admin role via service role (bypass RLS)
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { email, password, full_name, role } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: role || 'client' },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Update profile role if needed (trigger creates it as 'client' by default)
  if (newUser?.user && role === 'admin') {
    await adminClient.from('profiles').update({ role: 'admin' }).eq('id', newUser.user.id)
  }

  return NextResponse.json({ success: true, userId: newUser?.user?.id })
}

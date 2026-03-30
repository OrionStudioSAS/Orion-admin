'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SupportMessage } from '@/types/database'

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')
  return user
}

export async function getMessages(profileId: string): Promise<SupportMessage[]> {
  const user = await getCurrentUser()
  const admin = createAdminClient()

  // Vérifier que l'utilisateur a le droit de lire ce thread
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && user.id !== profileId) throw new Error('Accès refusé')

  const { data } = await admin
    .from('support_messages')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })

  return data || []
}

export async function sendMessage(content: string, profileId: string): Promise<void> {
  const user = await getCurrentUser()
  const admin = createAdminClient()

  const { data: senderProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = senderProfile?.role === 'admin'

  // Member can only send to their own thread
  if (!isAdmin && user.id !== profileId) throw new Error('Accès refusé')

  await admin.from('support_messages').insert({
    profile_id: profileId,
    sender_id: user.id,
    content: content.trim(),
    is_admin_sender: isAdmin,
    is_read: false,
  })

  revalidatePath('/chat')
  revalidatePath('/admin/chat')
}

export async function markMessagesRead(profileId: string): Promise<void> {
  const user = await getCurrentUser()
  const admin = createAdminClient()

  const { data: readerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = readerProfile?.role === 'admin'

  // Admin reads → mark member messages (is_admin_sender=false) as read
  // Member reads → mark admin messages (is_admin_sender=true) as read
  await admin
    .from('support_messages')
    .update({ is_read: true })
    .eq('profile_id', profileId)
    .eq('is_admin_sender', !isAdmin)
    .eq('is_read', false)
}

export async function getConversations() {
  const user = await getCurrentUser()
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Accès refusé')

  const { data: messages } = await admin
    .from('support_messages')
    .select('*, profiles!profile_id(id, full_name, email, company)')
    .order('created_at', { ascending: false })

  if (!messages) return []

  // Group by profile_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>()
  for (const msg of messages) {
    const pid = msg.profile_id
    if (!map.has(pid)) {
      map.set(pid, {
        profile: msg.profiles,
        latestMessage: msg,
        unreadCount: 0,
      })
    }
    if (!msg.is_admin_sender && !msg.is_read) {
      map.get(pid).unreadCount++
    }
  }

  return Array.from(map.values())
}

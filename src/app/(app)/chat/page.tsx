import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon, MessageIcon } from '@/components/ui/Icons'
import ChatWindow from '@/components/chat/ChatWindow'
import { SupportMessage } from '@/types/database'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role === 'admin') redirect('/admin/chat')

  const { data: messages } = await admin
    .from('support_messages')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: true })

  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem)] lg:h-screen p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#3f3f46]" />
          <span className="text-[#3f3f46] text-xs tracking-widest uppercase font-medium">Support</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Messages</h1>
          <div className="flex items-center gap-1.5 text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            En ligne
          </div>
        </div>
        <p className="text-[#71717a] text-sm mt-1">Échangez directement avec notre équipe</p>
      </div>

      {/* Chat */}
      <div className="flex-1 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden flex flex-col min-h-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <MessageIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">Orion Studio</div>
            <div className="text-[11px] text-[#71717a]">Support & Assistance</div>
          </div>
        </div>
        <ChatWindow
          profileId={user.id}
          isAdmin={false}
          initialMessages={(messages || []) as SupportMessage[]}
        />
      </div>
    </div>
  )
}

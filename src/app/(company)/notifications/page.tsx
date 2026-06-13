import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAnnouncements } from '@/actions/announcements'
import { NotificationsClient } from './notifications-client'
import { Bell } from 'lucide-react'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('notifications_subscribed')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { notifications_subscribed: boolean } | null
  const subscribed = profile?.notifications_subscribed ?? true

  const announcements = await getAnnouncements()

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
          <Bell size={18} className="text-gray-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            System announcements from Rivera
          </p>
        </div>
      </div>

      <NotificationsClient
        announcements={announcements}
        subscribed={subscribed}
      />
    </div>
  )
}
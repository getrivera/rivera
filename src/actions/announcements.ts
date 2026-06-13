'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export type Announcement = {
  id: string
  title: string
  body: string
  type: 'info' | 'warning' | 'feature' | 'maintenance'
  created_at: string
  is_read: boolean
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Check if user is subscribed
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('notifications_subscribed')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { notifications_subscribed: boolean } | null
  if (profile?.notifications_subscribed === false) return []

  const adminClient = createAdminClient()

  // Get active announcements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: announcementsRaw } = await (adminClient as any)
    .from('rivera_announcements')
    .select('id, title, body, type, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (!announcementsRaw || announcementsRaw.length === 0) return []

  const announcements = announcementsRaw as {
    id: string
    title: string
    body: string
    type: 'info' | 'warning' | 'feature' | 'maintenance'
    created_at: string
  }[]

  // Get read status for this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: readsRaw } = await (adminClient as any)
    .from('rivera_announcement_reads')
    .select('announcement_id')
    .eq('user_id', user.id)

  const readIds = new Set(
    (readsRaw ?? []).map((r: { announcement_id: string }) => r.announcement_id)
  )

  return announcements.map((a) => ({
    ...a,
    is_read: readIds.has(a.id),
  }))
}

export async function markAnnouncementRead(announcementId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('rivera_announcement_reads')
    .upsert(
      { user_id: user.id, announcement_id: announcementId },
      { onConflict: 'user_id,announcement_id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('MARK READ FAILED:', error.message)
    return { success: false, error: 'Failed to mark as read' }
  }

  revalidatePath('/')
  return { success: true, data: undefined }
}

export async function markAllAnnouncementsRead(): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get all active announcements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: announcementsRaw } = await (adminClient as any)
    .from('rivera_announcements')
    .select('id')
    .eq('is_active', true)

  if (!announcementsRaw || announcementsRaw.length === 0) {
    return { success: true, data: undefined }
  }

  const announcements = announcementsRaw as { id: string }[]

  // Get already read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: readsRaw } = await (adminClient as any)
    .from('rivera_announcement_reads')
    .select('announcement_id')
    .eq('user_id', user.id)

  const readIds = new Set(
    (readsRaw ?? []).map((r: { announcement_id: string }) => r.announcement_id)
  )

  const unreadIds = announcements
    .filter((a) => !readIds.has(a.id))
    .map((a) => ({ user_id: user.id, announcement_id: a.id }))

  if (unreadIds.length === 0) return { success: true, data: undefined }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('rivera_announcement_reads')
    .upsert(unreadIds, { onConflict: 'user_id,announcement_id', ignoreDuplicates: true })

  revalidatePath('/')
  return { success: true, data: undefined }
}

export async function updateNotificationPreference(
  subscribed: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('profiles')
    .update({ notifications_subscribed: subscribed })
    .eq('id', user.id)

  if (error) {
    console.error('UPDATE NOTIFICATION PREF FAILED:', error.message)
    return { success: false, error: 'Failed to update preference' }
  }

  revalidatePath('/')
  return { success: true, data: undefined }
}
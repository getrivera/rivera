'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  markAnnouncementRead,
  markAllAnnouncementsRead,
  updateNotificationPreference,
} from '@/actions/announcements'
import type { Announcement } from '@/actions/announcements'
import {
  Bell,
  BellOff,
  CheckCheck,
  Info,
  AlertTriangle,
  Zap,
  Wrench,
  Check,
  Loader2,
} from 'lucide-react'

type Props = {
  announcements: Announcement[]
  subscribed: boolean
}

const TYPE_STYLES: Record<string, {
  icon: React.ElementType
  bg: string
  iconColor: string
  badge: string
  label: string
}> = {
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700',
    label: 'Warning',
  },
  feature: {
    icon: Zap,
    bg: 'bg-purple-50',
    iconColor: 'text-purple-500',
    badge: 'bg-purple-100 text-purple-700',
    label: 'New feature',
  },
  maintenance: {
    icon: Wrench,
    bg: 'bg-gray-50',
    iconColor: 'text-gray-500',
    badge: 'bg-gray-100 text-gray-600',
    label: 'Maintenance',
  },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationsClient({ announcements, subscribed }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localAnnouncements, setLocalAnnouncements] = useState(announcements)
  const [isSubscribed, setIsSubscribed] = useState(subscribed)
  const [prefSaved, setPrefSaved] = useState(false)

  const unreadCount = localAnnouncements.filter((a) => !a.is_read).length

  function handleMarkRead(announcementId: string) {
    setLocalAnnouncements((prev) =>
      prev.map((a) => a.id === announcementId ? { ...a, is_read: true } : a)
    )
    startTransition(async () => {
      await markAnnouncementRead(announcementId)
      router.refresh()
    })
  }

  function handleMarkAllRead() {
    setLocalAnnouncements((prev) => prev.map((a) => ({ ...a, is_read: true })))
    startTransition(async () => {
      await markAllAnnouncementsRead()
      router.refresh()
    })
  }

  function handleToggleSubscription() {
    const newValue = !isSubscribed
    setIsSubscribed(newValue)
    startTransition(async () => {
      await updateNotificationPreference(newValue)
      setPrefSaved(true)
      setTimeout(() => setPrefSaved(false), 3000)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Subscription toggle — prominent card */}
      <div className={`rounded-xl border-2 p-5 transition-colors ${
        isSubscribed
          ? 'border-brand-200 bg-brand-50'
          : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isSubscribed ? 'bg-brand-500' : 'bg-gray-300'
            }`}>
              {isSubscribed ? (
                <Bell size={22} className="text-white" />
              ) : (
                <BellOff size={22} className="text-white" />
              )}
            </div>
            <div>
              <p className={`text-base font-semibold ${
                isSubscribed ? 'text-brand-900' : 'text-gray-600'
              }`}>
                {isSubscribed ? 'Notifications enabled' : 'Notifications disabled'}
              </p>
              <p className={`text-sm mt-0.5 ${
                isSubscribed ? 'text-brand-600' : 'text-gray-400'
              }`}>
                {isSubscribed
                  ? 'You will receive Rivera system announcements'
                  : 'You won\'t receive any Rivera announcements'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {prefSaved && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <Check size={12} /> Saved
              </span>
            )}
            <button
              onClick={handleToggleSubscription}
              disabled={isPending}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                isSubscribed
                  ? 'bg-white border border-brand-300 text-brand-600 hover:bg-brand-50'
                  : 'bg-brand-500 text-white hover:bg-brand-600'
              }`}
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isSubscribed ? (
                <><BellOff size={14} /> Disable</>
              ) : (
                <><Bell size={14} /> Enable</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Header actions */}
      {localAnnouncements.length > 0 && unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline disabled:opacity-50"
          >
            <CheckCheck size={13} />
            Mark all as read
          </button>
        </div>
      )}

      {/* Announcements list */}
      {localAnnouncements.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <Bell size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No notifications yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Rivera system announcements will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {localAnnouncements.map((announcement) => {
            const typeStyle = TYPE_STYLES[announcement.type] ?? TYPE_STYLES.info
            const TypeIcon = typeStyle.icon

            return (
              <div
                key={announcement.id}
                className={`bg-white border rounded-xl p-5 transition-colors ${
                  !announcement.is_read
                    ? 'border-blue-200 bg-blue-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${typeStyle.bg}`}>
                    <TypeIcon size={16} className={typeStyle.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-semibold ${
                          !announcement.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {announcement.title}
                        </h3>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeStyle.badge}`}>
                          {typeStyle.label}
                        </span>
                        {!announcement.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      {!announcement.is_read && (
                        <button
                          onClick={() => handleMarkRead(announcement.id)}
                          disabled={isPending}
                          className="flex items-center gap-1 text-xs text-brand-500 hover:underline disabled:opacity-50 flex-shrink-0"
                        >
                          <Check size={11} />
                          Mark read
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {announcement.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(announcement.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
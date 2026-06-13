'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Bell, X, CheckCheck, Info, AlertTriangle, Zap, Wrench } from 'lucide-react'
import { markAnnouncementRead, markAllAnnouncementsRead } from '@/actions/announcements'
import { useRouter } from 'next/navigation'
import type { Announcement } from '@/actions/announcements'
import Link from 'next/link'

type Props = {
  announcements: Announcement[]
}

const TYPE_STYLES: Record<string, {
  icon: React.ElementType
  bg: string
  iconColor: string
  badge: string
}> = {
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  feature: {
    icon: Zap,
    bg: 'bg-purple-50',
    iconColor: 'text-purple-500',
    badge: 'bg-purple-100 text-purple-700',
  },
  maintenance: {
    icon: Wrench,
    bg: 'bg-gray-50',
    iconColor: 'text-gray-500',
    badge: 'bg-gray-100 text-gray-600',
  },
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export function NotificationsBell({ announcements }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [localAnnouncements, setLocalAnnouncements] = useState(announcements)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = localAnnouncements.filter((a) => !a.is_read).length

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleMarkRead(announcementId: string) {
    // Optimistic update
    setLocalAnnouncements((prev) =>
      prev.map((a) => a.id === announcementId ? { ...a, is_read: true } : a)
    )

    startTransition(async () => {
      await markAnnouncementRead(announcementId)
      router.refresh()
    })
  }

  function handleMarkAllRead() {
    // Optimistic update
    setLocalAnnouncements((prev) => prev.map((a) => ({ ...a, is_read: true })))

    startTransition(async () => {
      await markAllAnnouncementsRead()
      router.refresh()
    })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="flex items-center gap-1 text-xs text-brand-500 hover:underline disabled:opacity-50"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Announcement list */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {localAnnouncements.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={28} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400 font-medium">No notifications</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  You&apos;re all caught up
                </p>
              </div>
            ) : (
              localAnnouncements.map((announcement) => {
                const typeStyle = TYPE_STYLES[announcement.type] ?? TYPE_STYLES.info
                const TypeIcon = typeStyle.icon

                return (
                  <div
                    key={announcement.id}
                    className={`px-4 py-3 transition-colors ${
                      !announcement.is_read ? 'bg-blue-50/40' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 ${typeStyle.bg}`}>
                        <TypeIcon size={13} className={typeStyle.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-tight ${
                            !announcement.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {announcement.title}
                          </p>
                          {!announcement.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {announcement.body}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${typeStyle.badge}`}>
                            {announcement.type}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {timeAgo(announcement.created_at)}
                            </span>
                            {!announcement.is_read && (
                              <button
                                onClick={() => handleMarkRead(announcement.id)}
                                disabled={isPending}
                                className="text-xs text-brand-500 hover:underline disabled:opacity-50"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-brand-500 hover:underline"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
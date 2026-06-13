'use client'

import { usePathname } from 'next/navigation'
import { NotificationsBell } from './notifications-bell'
import type { Announcement } from '@/actions/announcements'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/listings':          'Listings',
  '/partners':          'Partners',
  '/buyers':            'Buyers',
  '/commissions':       'Commissions',
  '/invoices':          'Invoices',
  '/reports':           'Reports',
  '/audit':             'Audit Log',
  '/settings':          'Settings',
  '/staff':             'Staff',
  '/billing':           'Billing',
  '/virtual-accounts':  'Virtual Accounts',
  '/notifications':     'Notifications',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const match = Object.keys(PAGE_TITLES).find(
    (key) => key !== '/dashboard' && pathname.startsWith(key + '/')
  )
  return match ? PAGE_TITLES[match] : 'Rivera'
}

type Props = {
  companyName: string
  announcements: Announcement[]
}

export function Topbar({ companyName, announcements }: Props) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        <NotificationsBell announcements={announcements} />

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
          <span className="text-xs text-gray-500 font-medium truncate max-w-32">
            {companyName}
          </span>
        </div>
      </div>
    </header>
  )
}
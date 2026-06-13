'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  DollarSign,
  FileText,
  BarChart3,
  ScrollText,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/actions/auth'
import { can, type StaffRole } from '@/lib/permissions'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  show: (role: StaffRole) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    show: () => true,
  },
  {
    label: 'Listings',
    href: '/listings',
    icon: Building2,
    show: () => true,
  },
  {
    label: 'Partners',
    href: '/partners',
    icon: Users,
    show: () => true,
  },
  {
    label: 'Sales',
    href: '/sales',
    icon: UserCheck,
    show: () => true,
  },
  {
    label: 'Commissions',
    href: '/commissions',
    icon: DollarSign,
    show: (role) => can.approveCommissions(role),
  },
  {
    label: 'Virtual Accounts',
    href: '/virtual-accounts',
    icon: CreditCard,
    show: (role) => can.manageInvoices(role),
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: FileText,
    show: (role) => can.manageInvoices(role),
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    show: () => true,
  },
  {
    label: 'Audit Log',
    href: '/audit',
    icon: ScrollText,
    show: (role) => can.viewAuditLog(role),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    show: (role) => can.manageSettings(role),
  },
  {
    label: 'Billing',
    href: '/billing',
    icon: CreditCard,
    show: (role) => role === 'admin',
  },
]

type Props = {
  companyName: string
  userFullName: string
  userEmail: string
  userRole: string
  brandColour?: string | null
  logoUrl?: string | null
  isVerified?: boolean
}

export function Sidebar({
  companyName,
  userFullName,
  userEmail,
  userRole,
  brandColour,
  logoUrl,
  isVerified,
}: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const accentColour = brandColour ?? '#1B4F72'
  const role = userRole as StaffRole

  const visibleItems = NAV_ITEMS.filter((item) => item.show(role))

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo + company name */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b border-gray-100"
        style={{ minHeight: 64 }}
      >
        <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="w-full h-full object-contain"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: accentColour }}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900 truncate">{companyName}</p>
              {isVerified && (
                <span title="CAC Verified">
                  <ShieldCheck size={13} className="text-green-500 flex-shrink-0" />
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 capitalize">{userRole}</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors group',
                active
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
              style={active ? { backgroundColor: accentColour } : {}}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={18}
                className={cn(
                  'flex-shrink-0',
                  active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-gray-100 px-2 py-3 space-y-0.5">
        {!collapsed && (
          <div className="px-2 py-2 mb-1">
            <p className="text-sm font-medium text-gray-800 truncate">{userFullName}</p>
            <p className="text-xs text-gray-400 truncate">{userEmail}</p>
          </div>
        )}

        <form action={logout}>
          <button
            type="submit"
            className={cn(
              'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors',
              collapsed && 'justify-center'
            )}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight size={12} className="text-gray-500" />
          : <ChevronLeft size={12} className="text-gray-500" />
        }
      </button>
    </aside>
  )
}
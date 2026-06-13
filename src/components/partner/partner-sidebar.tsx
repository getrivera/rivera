'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  ShoppingBag,
  DollarSign,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { partnerLogout } from '@/actions/partner-auth'
import { setActiveCompany } from '@/actions/partner-company'

type Company = {
  id: string
  name: string
  logo_url: string | null
  brand_colour: string | null
}

type Props = {
  partnerName: string
  partnerEmail: string
  companyName: string
  companyId: string
  logoUrl: string | null
  brandColour: string | null
  companies: Company[]
  multiCompanyEnabled?: boolean
}

const NAV_ITEMS = [
  { label: 'Dashboard',   href: '/partner/dashboard',    icon: LayoutDashboard },
  { label: 'Listings',    href: '/partner/listings',     icon: Building2 },
  { label: 'My Sales',    href: '/partner/sales',        icon: ShoppingBag },
  { label: 'Commissions', href: '/partner/commissions',  icon: DollarSign },
  { label: 'Profile',     href: '/partner/profile',      icon: User },
]

export function PartnerSidebar({
  partnerName,
  partnerEmail,
  companyName,
  logoUrl,
  brandColour,
  companies,
  multiCompanyEnabled = false,
}: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [showCompanies, setShowCompanies] = useState(false)
  const [, startTransition] = useTransition()

  const accentColour = brandColour ?? '#1B4F72'
  const canSwitch = multiCompanyEnabled && companies.length > 1

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Company header */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b border-gray-100"
        style={{ minHeight: 64 }}
      >
        <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="w-full h-full object-contain" />
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
            <button
              onClick={() => canSwitch && setShowCompanies(!showCompanies)}
              className={cn(
                'flex items-center gap-1 w-full text-left',
                canSwitch ? 'cursor-pointer' : 'cursor-default'
              )}
              disabled={!canSwitch}
            >
              <p className="text-sm font-semibold text-gray-900 truncate">{companyName}</p>
              {canSwitch && (
                <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
              )}
            </button>
            <p className="text-xs text-gray-400">Partner</p>
          </div>
        )}

        {/* Company switcher dropdown */}
        {showCompanies && !collapsed && canSwitch && (
          <div className="absolute top-16 left-2 right-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setShowCompanies(false)
                  startTransition(async () => {
                    await setActiveCompany(c.id)
                  })
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 text-left"
              >
                <div className="w-6 h-6 rounded flex-shrink-0 overflow-hidden">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="w-full h-full object-contain" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: c.brand_colour ?? '#1B4F72' }}
                    >
                      {c.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-700 truncate">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
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
            <p className="text-sm font-medium text-gray-800 truncate">{partnerName}</p>
            <p className="text-xs text-gray-400 truncate">{partnerEmail}</p>
          </div>
        )}
        <form action={partnerLogout}>
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
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import type { CompanyOnboarding } from '@/types/supabase'
import { completedStepsCount } from '@/lib/onboarding-utils'

type Step = {
  key: keyof Pick<
    CompanyOnboarding,
    'company_verified' | 'branding_complete' | 'first_listing_created' | 'first_partner_invited'
  >
  title: string
  description: string
  cta: string
  href: string
}

const STEPS: Step[] = [
  {
    key: 'company_verified',
    title: 'Verify your company',
    description: 'Add your RC number and company address.',
    cta: 'Add details',
    href: '/settings?tab=company',
  },
  {
    key: 'branding_complete',
    title: 'Set up your branding',
    description: 'Upload your logo and choose your brand colour.',
    cta: 'Customise',
    href: '/settings?tab=branding',
  },
  {
    key: 'first_listing_created',
    title: 'Create your first listing',
    description: 'Add a property with pricing and installment plans.',
    cta: 'Create listing',
    href: '/listings/new',
  },
  {
    key: 'first_partner_invited',
    title: 'Invite your first partner',
    description: 'Invite an agent or share your company code.',
    cta: 'Invite partner',
    href: '/partners',
  },
]

type Props = {
  onboarding: CompanyOnboarding
}

export function OnboardingWidget({ onboarding }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const completed = completedStepsCount(onboarding)
  const total = STEPS.length
  const progressPct = Math.round((completed / total) * 100)

  return (
    <div className="w-72 flex-shrink-0">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden sticky top-6">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Get started</p>
            <p className="text-xs text-gray-500 mt-0.5">{completed} of {total} steps complete</p>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-brand-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Steps */}
        {!collapsed && (
          <div className="divide-y divide-gray-50">
            {STEPS.map((step) => {
              const done = onboarding[step.key]
              return (
                <div
                  key={step.key}
                  className={`px-4 py-3 ${done ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {done ? (
                        <CheckCircle2 size={18} className="text-green-500" />
                      ) : (
                        <Circle size={18} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {step.title}
                      </p>
                      {!done && (
                        <>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            {step.description}
                          </p>
                          <Link
                            href={step.href}
                            className="inline-block mt-2 text-xs font-medium text-brand-500 hover:underline"
                          >
                            {step.cta} →
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              This panel disappears once all steps are complete
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useTransition } from 'react'
import { setActiveCompany } from '@/actions/partner-company'
import { Loader2 } from 'lucide-react'

type Company = {
  id: string
  name: string
  logo_url: string | null
  brand_colour: string | null
}

export function PickCompanyClient({ companies }: { companies: Company[] }) {
  const [isPending, startTransition] = useTransition()
  const [pickingId, setPickingId] = useState<string | null>(null)

  function handlePick(companyId: string) {
    setPickingId(companyId)
    startTransition(async () => {
      await setActiveCompany(companyId)
    })
  }

  return (
    <div className="space-y-3">
      {companies.map((company) => (
        <button
          key={company.id}
          onClick={() => handlePick(company.id)}
          disabled={isPending}
          className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-500 hover:shadow-sm transition-all text-left disabled:opacity-60"
        >
          <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: company.brand_colour ?? '#1B4F72' }}
              >
                {company.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <p className="flex-1 text-sm font-medium text-gray-900">{company.name}</p>
          {pickingId === company.id && isPending && (
            <Loader2 size={16} className="text-brand-500 animate-spin flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  )
}
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { verifyCACNumber } from '@/actions/cac-verification'
import { CheckCircle, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'

type Props = {
  rcNumber: string | null
  isVerified: boolean
  cacCompanyName: string | null
  cacCompanyType: string | null
  cacCompanyStatus: string | null
  cacRegistrationDate: string | null
  cacVerifiedAt: string | null
  isAdmin: boolean
}

export function CACVerificationWidget({
  rcNumber,
  isVerified,
  cacCompanyName,
  cacCompanyType,
  cacCompanyStatus,
  cacRegistrationDate,
  cacVerifiedAt,
  isAdmin,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    companyName: string
    companyType: string
    status: string
    registrationDate: string
  } | null>(null)

  function handleVerify() {
    if (!rcNumber) {
      setError('Please save your RC number first before verifying.')
      return
    }
    setError(null)

    startTransition(async () => {
      const res = await verifyCACNumber(rcNumber)
      if (!res.success) {
        setError(res.error)
        return
      }
      setResult(res.data as typeof result)
      router.refresh()
    })
  }

  if (isVerified) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-green-600" />
          <p className="text-sm font-semibold text-green-800">CAC Verified</p>
          {cacVerifiedAt && (
            <span className="text-xs text-green-600 ml-auto">
              {new Date(cacVerifiedAt).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {cacCompanyName && (
            <div>
              <p className="text-green-600">Company name</p>
              <p className="font-medium text-green-900">{cacCompanyName}</p>
            </div>
          )}
          {cacCompanyType && (
            <div>
              <p className="text-green-600">Type</p>
              <p className="font-medium text-green-900 capitalize">
                {cacCompanyType.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
          )}
          {cacCompanyStatus && (
            <div>
              <p className="text-green-600">Status</p>
              <p className="font-medium text-green-900 capitalize">
                {cacCompanyStatus.toLowerCase()}
              </p>
            </div>
          )}
          {cacRegistrationDate && (
            <div>
              <p className="text-green-600">Registered</p>
              <p className="font-medium text-green-900">{cacRegistrationDate}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} className="text-yellow-500" />
        <p className="text-sm font-medium text-gray-700">CAC not verified</p>
      </div>

      <p className="text-xs text-gray-500">
        Verifying your RC number confirms your company&apos;s legitimacy to partners and buyers.
        A verified badge will be shown across your portal.
      </p>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {result && (
        <div className="p-3 bg-white rounded-lg border border-green-200 text-xs space-y-1">
          <p className="font-medium text-green-700 flex items-center gap-1">
            <CheckCircle size={12} /> Verification successful
          </p>
          <p className="text-gray-600">{result.companyName}</p>
        </div>
      )}

      {isAdmin && (
        <button
          onClick={handleVerify}
          disabled={isPending || !rcNumber}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          title={!rcNumber ? 'Save your RC number first' : undefined}
        >
          {isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Verifying…</>
          ) : (
            <><ShieldCheck size={14} /> Verify with CAC</>
          )}
        </button>
      )}

      {!rcNumber && (
        <p className="text-xs text-gray-400 text-center">
          Save your RC number above to enable verification
        </p>
      )}
    </div>
  )
}
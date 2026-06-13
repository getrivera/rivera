'use client'

import { useState, useTransition } from 'react'
import { saveInstallmentPlans } from '@/actions/listings'
import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { MoneyInput } from '@/components/ui/money-input'

type Plan = {
  name: string
  duration_months: string
  deposit_naira: string
  installment_count: string
  installment_naira: string
  penalty_rate: string
}

type ExistingPlan = {
  id: string
  name: string
  duration_months: number
  deposit_amount_kobo: number
  installment_count: number
  installment_amount_kobo: number
  penalty_rate: number
}

type Props = {
  listingId: string
  existingPlans: ExistingPlan[]
}

const emptyPlan = (): Plan => ({
  name: '',
  duration_months: '',
  deposit_naira: '',
  installment_count: '',
  installment_naira: '',
  penalty_rate: '0',
})

function existingToFormPlan(plan: ExistingPlan): Plan {
  return {
    name: plan.name,
    duration_months: plan.duration_months.toString(),
    deposit_naira: (plan.deposit_amount_kobo / 100).toString(),
    installment_count: plan.installment_count.toString(),
    installment_naira: (plan.installment_amount_kobo / 100).toString(),
    penalty_rate: plan.penalty_rate.toString(),
  }
}

export function InstallmentPlansForm({ listingId, existingPlans }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Pre-fill with existing plans if any, otherwise start with one empty plan
  const [plans, setPlans] = useState<Plan[]>(
    existingPlans.length > 0
      ? existingPlans.map(existingToFormPlan)
      : [emptyPlan()]
  )
  const [outright, setOutright] = useState(existingPlans.length === 0 ? false : false)

  function addPlan() {
    setPlans([...plans, emptyPlan()])
  }

  function removePlan(index: number) {
    setPlans(plans.filter((_, i) => i !== index))
  }

  function updatePlan(index: number, field: keyof Plan, value: string) {
    const updated = [...plans]
    updated[index] = { ...updated[index], [field]: value }
    setPlans(updated)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    if (outright) {
      formData.set('plan_count', '0')
    } else {
      formData.set('plan_count', plans.length.toString())
      plans.forEach((plan, i) => {
        formData.set(`plan_${i}_name`, plan.name)
        formData.set(`plan_${i}_duration_months`, plan.duration_months)
        formData.set(`plan_${i}_deposit_naira`, plan.deposit_naira)
        formData.set(`plan_${i}_installment_count`, plan.installment_count)
        formData.set(`plan_${i}_installment_naira`, plan.installment_naira)
        formData.set(`plan_${i}_penalty_rate`, plan.penalty_rate)
      })
    }

    startTransition(async () => {
      try {
        await saveInstallmentPlans(listingId, formData)
      } catch (err) {
        const error = err as { digest?: string; message?: string }
        if (!error?.digest?.includes('NEXT_REDIRECT')) {
          setError('Failed to save plans. Please try again.')
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Outright only toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="outright"
            checked={outright}
            onChange={(e) => setOutright(e.target.checked)}
            className="rounded border-gray-300"
          />
          <div>
            <label
              htmlFor="outright"
              className="text-sm font-medium text-gray-800 cursor-pointer"
            >
              Outright purchase only — no installment plans
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              Buyers must pay the full amount upfront. Skip to Step 3.
            </p>
          </div>
        </div>
      </div>

      {!outright && (
        <>
          {plans.map((plan, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800">Plan {i + 1}</h3>
                {plans.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePlan(i)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={plan.name}
                    onChange={(e) => updatePlan(i, 'name', e.target.value)}
                    placeholder="e.g. 12-Month Plan"
                    required={!outright}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (months) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={plan.duration_months}
                    onChange={(e) =>
                      updatePlan(i, 'duration_months', e.target.value)
                    }
                    placeholder="e.g. 12"
                    min="1"
                    required={!outright}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial deposit (₦) <span className="text-red-500">*</span>
                  </label>
                  <MoneyInput
                    value={plan.deposit_naira}
                    onValueChange={(raw) => updatePlan(i, 'deposit_naira', raw)}
                    placeholder="e.g. 1,000,000"
                    required={!outright}
                    prefix="₦"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of installments <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={plan.installment_count}
                    onChange={(e) =>
                      updatePlan(i, 'installment_count', e.target.value)
                    }
                    placeholder="e.g. 12"
                    min="1"
                    required={!outright}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount per installment (₦) <span className="text-red-500">*</span>
                  </label>
                  <MoneyInput
                    value={plan.installment_naira}
                    onValueChange={(raw) => updatePlan(i, 'installment_naira', raw)}
                    placeholder="e.g. 333,333"
                    required={!outright}
                    prefix="₦"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Late penalty (% per month)
                  </label>
                  <input
                    type="number"
                    value={plan.penalty_rate}
                    onChange={(e) =>
                      updatePlan(i, 'penalty_rate', e.target.value)
                    }
                    placeholder="e.g. 2"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addPlan}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-brand-500 hover:text-brand-500 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add another plan
          </button>
        </>
      )}

      <div className="flex items-center justify-between pt-2">
        <Link
          href={`/listings/${listingId}/edit`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to details
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending
            ? 'Saving…'
            : outright
            ? 'Skip to Step 3 →'
            : 'Save & continue →'}
        </button>
      </div>
    </form>
  )
}
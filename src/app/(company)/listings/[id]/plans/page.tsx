import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InstallmentPlansForm } from './plans-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

type InstallmentPlan = {
  id: string
  name: string
  duration_months: number
  deposit_amount_kobo: number
  installment_count: number
  installment_amount_kobo: number
  penalty_rate: number
}

export default async function InstallmentPlansPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) redirect('/login')
  const staff = staffData as StaffRecord

  // Fetch existing plans for this listing
  const { data: existingPlans } = await supabase
    .from('installment_plans')
    .select('*')
    .eq('listing_id', params.id)
    .eq('company_id', staff.company_id)
    .order('duration_months', { ascending: true })

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/listings/${params.id}`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={16} /> Back to listing
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">
            2
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Installment plans</h1>
        </div>
        <p className="text-gray-500 text-sm ml-10">
          Step 2 of 3 — Payment options for buyers
        </p>
      </div>

      <InstallmentPlansForm
        listingId={params.id}
        existingPlans={(existingPlans as InstallmentPlan[]) ?? []}
      />
    </div>
  )
}
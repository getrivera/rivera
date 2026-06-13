import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingEditForm } from './listing-edit-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

export default async function EditListingPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) redirect('/login')
  const staff = staffData as StaffRecord

  if (!['admin', 'manager'].includes(staff.role)) redirect('/listings')

  const { data: listingData } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', staff.company_id)
    .single()

  if (!listingData) notFound()

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
            1
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Edit listing</h1>
        </div>
        <p className="text-gray-500 text-sm ml-10">Step 1 of 3 — Property details</p>
      </div>
      <ListingEditForm listing={listingData} />
    </div>
  )
}
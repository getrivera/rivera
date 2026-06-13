import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KitForm } from './kit-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

type MarketingAsset = {
  id: string
  file_name: string
  file_type: string
  storage_url: string
  size_bytes: number
  download_count: number
}

type Listing = {
  id: string
  gallery_urls: string[]
}

export default async function MarketingKitPage({
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

  // Get existing gallery from listing
  const { data: listingData } = await supabase
    .from('listings')
    .select('id, gallery_urls')
    .eq('id', params.id)
    .eq('company_id', staff.company_id)
    .single()

  // Get existing marketing assets
  const { data: assets } = await supabase
    .from('marketing_assets')
    .select('*')
    .eq('listing_id', params.id)
    .eq('company_id', staff.company_id)
    .order('created_at', { ascending: true })

  const listing = listingData as Listing | null
  const galleryUrls = listing?.gallery_urls ?? []

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/listings/${params.id}/plans`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={16} /> Back to plans
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">
            3
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gallery & marketing kit</h1>
        </div>
        <p className="text-gray-500 text-sm ml-10">
          Step 3 of 3 — Photos and partner resources
        </p>
      </div>

      <KitForm
        listingId={params.id}
        existingGalleryUrls={galleryUrls}
        existingAssets={(assets as MarketingAsset[]) ?? []}
      />
    </div>
  )
}
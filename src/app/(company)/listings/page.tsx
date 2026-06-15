import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Plus, Building2 } from 'lucide-react'
import { formatNaira } from '@/lib/utils'

type StaffRecord = { company_id: string; role: string }

type Listing = {
  id: string
  title: string
  property_type: string
  location_city: string
  location_state: string
  price_kobo: number
  units_total: number
  units_allocated: number
  unit_type: string
  status: string
}

export default async function ListingsPage() {
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

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, property_type, location_city, location_state, price_kobo, units_total, units_allocated, unit_type, status')
    .eq('company_id', staff.company_id)
    .order('created_at', { ascending: false })

  const canCreate = ['admin', 'manager', 'coordinator'].includes(staff.role)

  const statusStyles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    sold_out: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-red-100 text-red-600',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your property listings</p>
        </div>
        {canCreate && (
          <Link
            href="/listings/new"
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            New listing
          </Link>
        )}
      </div>

      {!listings || listings.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No listings yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first property listing to get started</p>
          {canCreate && (
            <Link
              href="/listings/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={16} />
              Create listing
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(listings as Listing[]).map((listing) => {
            const remaining = (listing.units_total ?? 0) - (listing.units_allocated ?? 0)
            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-500 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-brand-500 transition-colors">
                      {listing.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{listing.property_type}</p>
                  </div>
                  <span className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[listing.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {listing.status}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mb-3">
                  {listing.location_city}, {listing.location_state}
                </p>

                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-900">
                    {formatNaira(listing.price_kobo)}
                  </p>
                  {listing.units_total ? (
                    <p className={`text-xs font-medium ${remaining === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {remaining} / {listing.units_total} {listing.unit_type} left
                    </p>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
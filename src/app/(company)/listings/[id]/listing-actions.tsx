'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { publishListing, archiveListing } from '@/actions/listings'
import { Edit, Archive, Globe, Loader2, ChevronDown } from 'lucide-react'

type Props = {
  listingId: string
  status: string
}

export function ListingActions({ listingId, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handlePublish() {
    startTransition(async () => {
      const result = await publishListing(listingId)
      if (!result.success) setError(result.error)
      else router.refresh()
    })
  }

  async function handleArchive() {
    if (!confirm('Archive this listing? It will be hidden from partners.')) return
    startTransition(async () => {
      const result = await archiveListing(listingId)
      if (!result.success) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="relative">
      {error && (
        <p className="text-xs text-red-500 mb-2 text-right">{error}</p>
      )}
      <div className="flex items-center gap-2">
        <Link
          href={`/listings/${listingId}/edit`}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Edit size={14} />
          Edit
        </Link>

        {status === 'draft' && (
          <button
            onClick={handlePublish}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            Publish
          </button>
        )}

        {status === 'active' && (
          <button
            onClick={handleArchive}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-60 transition-colors"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
            Archive
          </button>
        )}
      </div>
    </div>
  )
}
import { Skeleton } from '@/components/ui/skeleton'

export default function ListingEditLoading() {
  return (
    <div className="p-6 max-w-2xl">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-7 w-36 mb-6" />

      <div className="space-y-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
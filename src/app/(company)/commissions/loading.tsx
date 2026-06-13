import { Skeleton } from '@/components/ui/skeleton'

export default function CommissionsLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Skeleton className="h-9 flex-1 min-w-48 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <Skeleton className="h-3 w-40 mb-4" />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex gap-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 flex-1">
              <Skeleton className="h-4 w-4" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
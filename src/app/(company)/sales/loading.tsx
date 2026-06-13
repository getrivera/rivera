import { Skeleton } from '@/components/ui/skeleton'

export default function SalesLoading() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-36 mt-2" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Skeleton className="h-9 flex-1 min-w-48 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <Skeleton className="h-3 w-32 mb-4" />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
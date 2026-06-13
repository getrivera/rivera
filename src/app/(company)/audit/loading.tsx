import { Skeleton } from '@/components/ui/skeleton'

export default function AuditLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-52 mt-2" />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Skeleton className="h-9 flex-1 min-w-48 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-start gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0">
            <Skeleton className="h-3 w-24 mt-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
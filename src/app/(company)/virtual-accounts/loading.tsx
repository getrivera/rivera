import { Skeleton } from '@/components/ui/skeleton'

export default function VirtualAccountsLoading() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex gap-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 font-mono" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
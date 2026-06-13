import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-48" />
          <div className="flex items-end gap-3 h-32 mt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gray-100 animate-pulse rounded-t-md" style={{ height: `${30 + Math.random() * 60}%` }} />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-16 w-full mt-4 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-14" />
            </div>
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex items-center justify-between p-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
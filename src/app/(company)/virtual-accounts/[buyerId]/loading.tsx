import { Skeleton } from '@/components/ui/skeleton'

export default function VirtualAccountDetailLoading() {
  return (
    <div className="p-6 max-w-3xl">
      <Skeleton className="h-4 w-40 mb-4" />
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="space-y-5">
        {/* VA card */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-6 space-y-3" style={{ background: 'var(--brand-500, #4F46E5)' }}>
            <Skeleton className="h-3 w-24 opacity-50" />
            <Skeleton className="h-9 w-40 opacity-70" />
            <Skeleton className="h-4 w-32 opacity-50" />
          </div>
          <div className="p-4 flex items-center justify-between bg-gray-50">
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
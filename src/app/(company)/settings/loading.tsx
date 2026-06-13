import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-t-lg" />
        ))}
      </div>

      <div className="space-y-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="p-4 border border-gray-200 rounded-xl space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  )
}
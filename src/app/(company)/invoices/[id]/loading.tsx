import { Skeleton } from '@/components/ui/skeleton'

export default function InvoiceDetailLoading() {
  return (
    <div className="p-6 max-w-3xl">
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-5 w-28 ml-auto" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}
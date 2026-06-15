import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-7 gap-4">
        <Skeleton className="lg:col-span-4 h-72 rounded-xl" />
        <Skeleton className="lg:col-span-3 h-72 rounded-xl" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

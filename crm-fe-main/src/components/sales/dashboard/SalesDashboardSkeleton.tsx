"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function SalesDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid lg:grid-cols-7 gap-6">
        <Skeleton className="lg:col-span-4 h-72" />
        <Skeleton className="lg:col-span-3 h-72" />
      </div>
      <div className="grid lg:grid-cols-7 gap-6">
        <Skeleton className="lg:col-span-4 h-64" />
        <Skeleton className="lg:col-span-3 h-64" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

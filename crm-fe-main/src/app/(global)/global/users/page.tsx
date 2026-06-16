"use client";

import { Suspense } from "react";
import { UsersPageContent } from "@/components/global/users/UsersPageContent";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <UsersPageContent />
    </Suspense>
  );
}

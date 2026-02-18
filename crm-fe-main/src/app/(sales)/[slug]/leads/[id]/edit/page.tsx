"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { leadsApi } from "@/lib/api";
import { LeadForm } from "@/components/leads/lead-form";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead } from "@/types";

export default function EditLeadPage() {
  const { id } = useParams();
  const router = useRouter();

  const {
    data: lead,
    isLoading,
    error,
  } = useSWR(id ? `lead-${id}` : null, () =>
    leadsApi.get(id as string)
  );

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-red-600">
          Failed to load lead
        </h2>
        <p className="text-muted-foreground mt-2">
          The lead you are trying to edit could not be found or an error
          occurred.
        </p>
        <button
          onClick={() => router.push("/sales/leads")}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Leads
        </button>
      </div>
    );
  }

  return <LeadForm mode="edit" initialData={lead as Lead} />;
}

"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DocumentStatsDto, EmployeeDocumentDto } from "@/types/hr-documents";
import type { HrEmployeeDirectoryRow } from "@/types/hr-leaves";
import { DEFAULT_REQUIRED_DOCUMENT_SLUGS } from "./document-utils";

export function DocumentKPICards({
  stats,
  documents,
  employees,
  loading,
}: {
  stats: DocumentStatsDto | null;
  documents: EmployeeDocumentDto[];
  employees: HrEmployeeDirectoryRow[];
  loading: boolean;
}) {
  const expiringSoon = useMemo(() => {
    const now = Date.now();
    return documents.filter((d) => {
      if (!d.expiryDate) return false;
      const t = new Date(d.expiryDate).getTime();
      const days = Math.ceil((t - now) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    }).length;
  }, [documents]);

  const missingRequiredEmployees = useMemo(() => {
    const required = new Set(DEFAULT_REQUIRED_DOCUMENT_SLUGS);
    let n = 0;
    for (const e of employees) {
      const uid = e.id;
      const byType = new Map<string, EmployeeDocumentDto[]>();
      for (const d of documents) {
        if (d.userId !== uid) continue;
        if (!byType.has(d.documentType)) byType.set(d.documentType, []);
        byType.get(d.documentType)!.push(d);
      }
      let miss = false;
      for (const slug of required) {
        const list = byType.get(slug) || [];
        const ok = list.some((x) => x.isVerified);
        if (!ok) {
          miss = true;
          break;
        }
      }
      if (miss) n += 1;
    }
    return n;
  }, [documents, employees]);

  if (loading && !stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const total = stats?.total ?? documents.length;
  const unverified = stats?.unverified ?? documents.filter((d) => !d.isVerified).length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total documents</p>
          <p className="text-2xl font-bold">{total}</p>
        </CardContent>
      </Card>
      <Card className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
            Pending verification
          </p>
          <p className="text-2xl font-bold text-amber-950 dark:text-amber-50">{unverified}</p>
        </CardContent>
      </Card>
      <Card
        className={
          expiringSoon > 0
            ? "border-red-200 bg-red-50/70 dark:bg-red-950/25"
            : undefined
        }
      >
        <CardContent className="p-4">
          <p
            className={
              expiringSoon > 0
                ? "text-xs font-medium text-red-900 dark:text-red-100"
                : "text-xs font-medium text-muted-foreground"
            }
          >
            Expiring in 30 days
          </p>
          <p
            className={
              expiringSoon > 0
                ? "text-2xl font-bold text-red-800 dark:text-red-200"
                : "text-2xl font-bold"
            }
          >
            {expiringSoon}
          </p>
        </CardContent>
      </Card>
      <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/15">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
            Missing required docs
          </p>
          <p className="text-2xl font-bold text-amber-950 dark:text-amber-50">
            {missingRequiredEmployees}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Based on {DEFAULT_REQUIRED_DOCUMENT_SLUGS.join(", ")} (org policy)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

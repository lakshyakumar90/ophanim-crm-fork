"use client";

import { Suspense } from "react";
import { usePayrollPage } from "@/hooks/hr/usePayrollPage";
import { PayrollPageShell } from "@/components/hr/payroll/PayrollPageShell";
import { PayrollRunDetailSheet } from "@/components/hr/payroll/PayrollRunDetailSheet";
import { useSheetQuery } from "@/hooks/use-sheet-query";
import { Skeleton } from "@/components/ui/skeleton";

function PayrollPageContent() {
  const state = usePayrollPage();
  const sheet = useSheetQuery();

  return (
    <>
      <PayrollPageShell
        {...state}
        onViewRun={(runId) => sheet.openDetail(runId)}
      />

      <PayrollRunDetailSheet
        runId={sheet.selectedId}
        open={Boolean(sheet.selectedId)}
        onOpenChange={(open) => !open && sheet.closeDetail()}
        onUpdated={() => void state.mutateRuns()}
        onNavigateToRun={(runId) => sheet.openDetail(runId)}
      />
    </>
  );
}

export default function PayrollRunsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <PayrollPageContent />
    </Suspense>
  );
}

"use client";

import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayrollRunTableRow } from "@/components/hr/payroll/payroll-run-table-row";
import type { PayrollRun } from "@/types/payroll";

type Props = {
  yearFilter: string;
  setYearFilter: (v: string) => void;
  runsLoading: boolean;
  filteredRuns: PayrollRun[];
  canApprove: boolean;
  canManage: boolean;
  approvingId: string | null;
  onQuickApprove: (run: PayrollRun) => void | Promise<void>;
  onCorrection: (run: PayrollRun) => void;
  onViewRun: (runId: string) => void;
};

export function PayrollRunsTab({
  yearFilter,
  setYearFilter,
  runsLoading,
  filteredRuns,
  canApprove,
  canManage,
  approvingId,
  onQuickApprove,
  onCorrection,
  onViewRun,
}: Props) {

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-37.5">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map((i) => {
                    const year = (new Date().getFullYear() - i).toString();
                    return (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
  
            <div className="rounded-md border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Initiated by</TableHead>
                      <TableHead>Approved by</TableHead>
                      <TableHead>Correction</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 9 }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredRuns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                          <Receipt className="h-10 w-10 mx-auto mb-2 opacity-20" />
                          No payroll runs for {yearFilter}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRuns.map((run) => (
                        <PayrollRunTableRow
                          key={run.id}
                          run={run}
                          canApprove={canApprove}
                          canManage={canManage}
                          approvingId={approvingId}
                          onView={() => onViewRun(run.id)}
                          onApprove={() => void onQuickApprove(run)}
                          onCorrection={() => onCorrection(run)}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
    </div>
  );
}

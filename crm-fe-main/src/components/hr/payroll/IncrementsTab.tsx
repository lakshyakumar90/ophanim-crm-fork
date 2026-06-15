"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/lib/payroll-format";
import type { IncrementProposal } from "@/types/payroll";

type Props = {
  canManage: boolean;
  canApprove: boolean;
  incLoading: boolean;
  proposals: IncrementProposal[];
  pendingIncrements: IncrementProposal[];
  bulkApproving: boolean;
  bulkRejecting: boolean;
  onCreate: () => void;
  onApproveAll: () => void | Promise<void>;
  onRejectAllOpen: () => void;
  onReject: (id: string) => void;
  onApprove: (p: { id: string; name: string; from: number; to: number }) => void;
};

export function IncrementsTab({
  canManage,
  canApprove,
  incLoading,
  proposals,
  pendingIncrements,
  bulkApproving,
  bulkRejecting,
  onCreate,
  onApproveAll,
  onRejectAllOpen,
  onReject,
  onApprove,
}: Props) {
  return (
    <div className="mt-4 space-y-4">
            {canManage && (
              <div className="flex justify-end">
                <Button onClick={() => onCreate()}>New increment proposal</Button>
              </div>
            )}
  
            {canApprove && pendingIncrements.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Pending increments: <span className="text-foreground font-medium">{pendingIncrements.length}</span>
                </div>
                <div className="flex gap-2 justify-start sm:justify-end">
                  <Button
                    size="sm"
                    disabled={bulkApproving}
                    onClick={() => void onApproveAll()}
                  >
                    {bulkApproving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving…
                      </>
                    ) : (
                      `Approve all (${pendingIncrements.length})`
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkRejecting}
                    onClick={() => onRejectAllOpen()}
                  >
                    Reject all
                  </Button>
                </div>
              </div>
            )}
            <div className="rounded-md border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Current CTC</TableHead>
                    <TableHead className="text-right">Proposed</TableHead>
                    <TableHead className="text-right">% Change</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested by</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : proposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No increment proposals
                      </TableCell>
                    </TableRow>
                  ) : (
                    proposals.map((p) => {
                      const pct =
                        p.current_ctc && p.current_ctc > 0
                          ? Math.round(((p.proposed_ctc - p.current_ctc) / p.current_ctc) * 1000) / 10
                          : null;
                      const statusColor =
                        p.status === "pending"
                          ? "bg-amber-100 text-amber-900"
                          : p.status === "approved"
                            ? "bg-emerald-100 text-emerald-900"
                            : p.status === "rejected"
                              ? "bg-red-100 text-red-900"
                              : "bg-muted";
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.employee?.full_name || p.employee_id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatINR(p.current_ctc)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatINR(p.proposed_ctc)}</TableCell>
                          <TableCell className="text-right">
                            {pct !== null ? `${pct >= 0 ? "+" : ""}${pct}%` : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColor} variant="secondary">
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {p.proposed_by_user?.full_name || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {p.status === "pending" && canApprove && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onReject(p.id)}
                                  disabled={bulkApproving || bulkRejecting}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    onApprove({
                                      id: p.id,
                                      name: p.employee?.full_name || "Employee",
                                      from: p.current_ctc ?? 0,
                                      to: p.proposed_ctc,
                                    })
                                  }
                                  disabled={bulkApproving || bulkRejecting}
                                >
                                  Approve
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
    </div>
  );
}

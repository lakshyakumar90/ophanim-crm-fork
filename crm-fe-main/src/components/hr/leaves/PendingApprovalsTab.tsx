"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaveRequestCard } from "./LeaveRequestCard";
import { RejectLeaveModal } from "./RejectLeaveModal";
import { approveLeave, rejectLeave } from "@/lib/hr-leave-api";
import type { LeaveRequestDto } from "@/types/hr-leaves";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AxiosError } from "axios";

function toastApiError(e: unknown, fallback: string) {
  if (e instanceof AxiosError) {
    const s = e.response?.status;
    const body = e.response?.data as { error?: { message?: string }; message?: string };
    const msg = body?.error?.message || body?.message;
    if (s === 403) toast.error("You don't have permission for this action");
    else if (s === 404) toast.error("Resource not found. It may have been deleted.");
    else if (msg) toast.error(msg);
    else toast.error(fallback);
    return;
  }
  toast.error(e instanceof Error ? e.message : fallback);
}

export function PendingApprovalsTab({
  canApprove,
  initialList,
  loading,
  onRefresh,
  onStatsRefresh,
}: {
  canApprove: boolean;
  initialList: LeaveRequestDto[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onStatsRefresh: () => Promise<void>;
}) {
  const [list, setList] = useState<LeaveRequestDto[]>(initialList);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestDto | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    setList(initialList);
  }, [initialList]);

  const toggleSel = useCallback((id: string, v: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  }, []);

  const removeLocal = useCallback((id: string) => {
    setList((prev) => prev.filter((x) => x.id !== id));
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }, []);

  const handleApprove = async (id: string) => {
    const snapshot = [...list];
    removeLocal(id);
    try {
      await approveLeave(id);
      toast.success("Leave approved");
      await onStatsRefresh();
    } catch (e) {
      setList(snapshot);
      toastApiError(e, "Approval failed");
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    const id = rejectTarget.id;
    const name = rejectTarget.employeeName || "Employee";
    const snapshot = [...list];
    removeLocal(id);
    setRejectTarget(null);
    try {
      await rejectLeave(id, reason);
      toast.success(`Leave rejected. ${name} notified.`);
      await onStatsRefresh();
    } catch (e) {
      setList(snapshot);
      toastApiError(e, "Rejection failed");
    }
  };

  const bulkApprove = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    const t = toast.loading(`Approving 0/${ids.length}…`);
    let ok = 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      try {
        await approveLeave(id);
        removeLocal(id);
        ok++;
        toast.loading(`Approving ${ok}/${ids.length}…`, { id: t });
      } catch (e) {
        toast.dismiss(t);
        toastApiError(e, "Bulk approve stopped due to an error");
        setBulkBusy(false);
        await onRefresh();
        return;
      }
    }
    toast.dismiss(t);
    toast.success(`Approved ${ok} request(s)`);
    setSelected(new Set());
    setBulkBusy(false);
    await onStatsRefresh();
    await onRefresh();
  };

  if (loading && list.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mb-3" />
        <p className="text-lg font-medium text-foreground">No pending leave requests 🎉</p>
        <p className="text-sm">You are all caught up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canApprove && selected.size > 0 ? (
        <div className="flex justify-end">
          <Button disabled={bulkBusy} onClick={() => void bulkApprove()}>
            {bulkBusy ? "Approving…" : `Approve selected (${selected.size})`}
          </Button>
        </div>
      ) : null}
      <div className="space-y-3">
        {list.map((leave) => (
          <LeaveRequestCard
            key={leave.id}
            leave={leave}
            selectable={canApprove}
            selected={selected.has(leave.id)}
            onSelectChange={toggleSel}
            showApprove={canApprove}
            showReject={canApprove}
            onApprove={(id) => void handleApprove(id)}
            onReject={setRejectTarget}
          />
        ))}
      </div>
      <RejectLeaveModal
        open={!!rejectTarget}
        onOpenChange={(v) => !v && setRejectTarget(null)}
        employeeName={rejectTarget?.employeeName || ""}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}

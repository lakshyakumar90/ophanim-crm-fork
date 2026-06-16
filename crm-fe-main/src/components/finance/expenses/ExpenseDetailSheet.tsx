"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { Check, ExternalLink, X } from "lucide-react";
import { expensesApi, type Expense } from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

export function ExpenseDetailSheet({
  expenseId,
  open,
  onOpenChange,
  onUpdated,
}: {
  expenseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();

  const { data: expense, isLoading, mutate } = useSWR<Expense>(
    user && expenseId && open ? ["expense", expenseId] : null,
    () => expensesApi.get(expenseId!),
  );

  const refresh = async () => {
    await mutate();
    onUpdated?.();
  };

  const handleApprove = async () => {
    if (!expenseId) return;
    try {
      await expensesApi.approve(expenseId);
      toast.success("Expense approved");
      refresh();
    } catch {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!expenseId) return;
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await expensesApi.reject(expenseId, reason);
      toast.success("Expense rejected");
      refresh();
    } catch {
      toast.error("Failed to reject");
    }
  };

  const canApprove =
    expense && (isAdmin || isManager) && expense.status === "pending";

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={expense?.expense_number || "Expense"}
      description={expense?.description}
      size="lg"
      footer={
        canApprove ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="text-destructive" onClick={handleReject}>
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !expense ? (
        <p className="text-muted-foreground text-sm">Expense not found.</p>
      ) : (
        <div className="space-y-5 text-sm">
          <Badge className={`${STATUS_COLORS[expense.status]} border-0 capitalize`}>
            {expense.status}
          </Badge>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{(expense.category as { name?: string })?.name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="text-lg font-bold">₹{Number(expense.amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">
                {format(new Date(expense.expense_date), "dd MMM yyyy")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Vendor</p>
              <p className="font-medium">{expense.vendor_name || "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Description</p>
            <p>{expense.description}</p>
          </div>
          {expense.receipt_url && (
            <a
              href={expense.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View receipt
            </a>
          )}
          {expense.rejection_reason && (
            <div className="rounded-lg border border-rose-200 p-3 text-rose-600">
              {expense.rejection_reason}
            </div>
          )}
        </div>
      )}
    </FormSideSheet>
  );
}

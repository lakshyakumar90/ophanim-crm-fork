"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { expensesApi, type Expense } from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, ArrowLeft, Check, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

export default function ExpenseDetailPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const params = useParams();
  const expenseId = params.id as string;

  const {
    data: expense,
    isLoading,
    mutate,
  } = useSWR<Expense>(user && expenseId ? ["expense", expenseId] : null, () =>
    expensesApi.get(expenseId),
  );

  const refreshExpenseData = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: refreshExpenseData,
    enabled: Boolean(user && expenseId),
  });

  const handleApprove = async () => {
    try {
      await expensesApi.approve(expenseId);
      toast.success("Expense approved");
      mutate();
    } catch (error) {
      toast.error("Failed to approve expense");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await expensesApi.reject(expenseId, reason);
      toast.success("Expense rejected");
      mutate();
    } catch (error) {
      toast.error("Failed to reject expense");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Expense not found</p>
        <Link href="/finance/expenses">
          <Button variant="link">Back to Expenses</Button>
        </Link>
      </div>
    );
  }

  const canApprove = (isAdmin || isManager) && expense.status === "pending";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/finance/expenses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              {expense.expense_number}
            </h1>
            <p className="text-muted-foreground">{expense.description}</p>
          </div>
          <Badge className={`${STATUS_COLORS[expense.status]} border-0 ml-2`}>
            {expense.status}
          </Badge>
        </div>

        {canApprove && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              className="text-destructive"
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        )}
      </div>

      {/* Expense Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">
                {(expense.category as any)?.name || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-bold text-lg">
                ₹{Number(expense.amount).toLocaleString()}
              </p>
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
            <div>
              <p className="text-muted-foreground">Submitted By</p>
              <p className="font-medium">
                {(expense.submitter as any)?.full_name || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Submitted On</p>
              <p className="font-medium">
                {format(new Date(expense.created_at), "dd MMM yyyy HH:mm")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{expense.description}</p>
        </CardContent>
      </Card>

      {/* Receipt */}
      {expense.receipt_url && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={expense.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View Receipt
            </a>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {expense.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {expense.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approval Info */}
      {expense.status !== "pending" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">
                {expense.status === "approved" ? "Approved" : "Rejected"} By:
              </span>{" "}
              {(expense.approver as any)?.full_name || "—"}
            </p>
            {expense.approved_at && (
              <p>
                <span className="text-muted-foreground">Date:</span>{" "}
                {format(new Date(expense.approved_at), "dd MMM yyyy HH:mm")}
              </p>
            )}
            {expense.rejection_reason && (
              <div className="mt-2 p-3 bg-rose-50 dark:bg-rose-950 rounded-lg">
                <p className="text-rose-700 dark:text-rose-300 font-medium">
                  Rejection Reason:
                </p>
                <p className="text-rose-600 dark:text-rose-400">
                  {expense.rejection_reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

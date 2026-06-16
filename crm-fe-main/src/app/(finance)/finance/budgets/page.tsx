"use client";

import { Suspense, useCallback, useState } from "react";
import useSWR from "swr";
import { PiggyBank, Plus } from "lucide-react";
import { budgetsApi, type Budget } from "@/lib/api";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { formatCurrency } from "@/lib/invoice-line-item-math";
import { CreateBudgetSheet } from "@/components/finance/budgets/CreateBudgetSheet";
import { useSheetQuery } from "@/hooks/use-sheet-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

function budgetTotal(b: Budget) {
  return Number(b.total_allocated ?? b.total_amount ?? 0);
}

function budgetSpent(b: Budget) {
  return Number(b.total_spent ?? b.spent_amount ?? 0);
}

function budgetCurrency(b: Budget) {
  return (b.currency || "INR") as "USD" | "CAD" | "GBP" | "EUR" | "INR";
}

function BudgetsPageContent() {
  const { user, can } = useAuth();
  const isAdmin = useIsAdmin();
  const canCreate = can("budgets:manage") || isAdmin;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sheet = useSheetQuery();

  const { data, isLoading, mutate } = useSWR(
    user ? ["budgets"] : null,
    () => budgetsApi.list({ limit: 50 }),
  );

  const budgets: Budget[] = Array.isArray(data)
    ? data
    : (data as { data?: Budget[] })?.data ?? (data as { budgets?: Budget[] })?.budgets ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <PiggyBank className="h-6 w-6 text-primary" />
              Budgets
            </h1>
            <p className="text-muted-foreground">Department budgets and spending limits</p>
          </div>
          {canCreate && (
            <Button onClick={sheet.openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Budget
            </Button>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Fiscal Year</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : budgets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No budgets found
                  </TableCell>
                </TableRow>
              ) : (
                budgets.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.fiscal_year}</TableCell>
                    <TableCell>
                      {formatCurrency(budgetTotal(b), budgetCurrency(b))}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(budgetSpent(b), budgetCurrency(b))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {canCreate && (
        <CreateBudgetSheet
          open={sheet.createOpen}
          onOpenChange={(open) => (open ? sheet.openCreate() : sheet.closeCreate())}
          onCreated={() => mutate()}
        />
      )}
    </>
  );
}

export default function BudgetsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <BudgetsPageContent />
    </Suspense>
  );
}

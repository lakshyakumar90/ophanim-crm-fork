"use client";

import { Suspense, useState, useCallback } from "react";
import useSWR from "swr";
import { invoicesApi, type CurrencyCode, type Invoice } from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { InvoiceDetailSheet } from "@/components/finance/invoices/InvoiceDetailSheet";
import { useSheetQuery } from "@/hooks/use-sheet-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Eye,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { STATUS_COLORS } from "@/lib/invoice-line-item-math";

function formatCurrency(amount: number, currency: CurrencyCode = "INR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <InvoicesPageContent />
    </Suspense>
  );
}

function InvoicesPageContent() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sheet = useSheetQuery();

  const { data, isLoading, mutate } = useSWR(
    user ? ["invoices", statusFilter, search] : null,
    () =>
      invoicesApi
        .list({
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: search || undefined,
          limit: 50,
        })
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: handleRefresh,
    isRefreshing,
    enabled: Boolean(user),
  });

  const canCreateInvoice = isAdmin || isManager;

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Delete this invoice permanently? This will also remove its line items and payment records.",
    );
    if (!confirmed) return;

    try {
      await invoicesApi.delete(id);
      toast.success("Invoice deleted");
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete invoice");
    }
  };

  const invoices = data?.data || [];

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Invoices
          </h1>
          <p className="text-muted-foreground">
            Manage invoices and track payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {canCreateInvoice && (
            <Link href="/finance/invoices/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No invoices found</p>
          <Link href="/finance/invoices/new">
            <Button variant="link" className="mt-2">
              Create your first invoice
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice: Invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => sheet.openDetail(invoice.id)}
                >
                  <TableCell className="font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{invoice.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.client_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.invoice_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.due_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(
                      Number(invoice.total_amount),
                      invoice.currency || "INR",
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${STATUS_COLORS[invoice.status]} border-0`}
                    >
                      {invoice.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => sheet.openDetail(invoice.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {user?.role === "admin" && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(invoice.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Invoice
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>

    <InvoiceDetailSheet
      invoiceId={sheet.selectedId}
      open={Boolean(sheet.selectedId)}
      onOpenChange={(open) => !open && sheet.closeDetail()}
    />
    </>
  );
}

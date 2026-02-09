"use client";

import { useState } from "react";
import useSWR from "swr";
import { invoicesApi, type Invoice } from "@/lib/finance-api";
import { useAuth } from "@/providers/auth-provider";
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
  Send,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending_approval:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  overdue: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleApprove = async (id: string) => {
    try {
      await invoicesApi.approve(id);
      toast.success("Invoice approved");
      mutate();
    } catch (error) {
      toast.error("Failed to approve invoice");
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await invoicesApi.submit(id);
      toast.success("Invoice submitted for approval");
      mutate();
    } catch (error) {
      toast.error("Failed to submit invoice");
    }
  };

  const invoices = data?.data || [];

  return (
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
          <Link href="/finance/invoices/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </Link>
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
        <div className="border rounded-lg">
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
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/finance/invoices/${invoice.id}`}
                      className="hover:text-primary"
                    >
                      {invoice.invoice_number}
                    </Link>
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
                    ₹{Number(invoice.total_amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${STATUS_COLORS[invoice.status]} border-0`}
                    >
                      {invoice.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/finance/invoices/${invoice.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {invoice.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => handleSubmit(invoice.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Submit for Approval
                          </DropdownMenuItem>
                        )}
                        {invoice.status === "pending_approval" &&
                          (user?.role === "admin" ||
                            user?.role === "manager") && (
                            <DropdownMenuItem
                              onClick={() => handleApprove(invoice.id)}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Approve
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
  );
}

"use client";

import { useState } from "react";
import useSWR from "swr";
import { paymentsApi } from "@/lib/finance-api";
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
import { CircleDollarSign, Search, RefreshCw } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

const MODE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    user ? ["payments", modeFilter] : null,
    () =>
      paymentsApi
        .list({
          payment_mode: modeFilter !== "all" ? modeFilter : undefined,
          limit: 50,
        })
        .then((res) => res.data.data),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const payments = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CircleDollarSign className="h-6 w-6 text-primary" />
            Payments
          </h1>
          <p className="text-muted-foreground">
            Track all payment transactions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Payment Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="other">Other</SelectItem>
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
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CircleDollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No payments found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/finance/invoices/${payment.invoice_id}`}
                      className="hover:text-primary"
                    >
                      {payment.invoice?.invoice_number || "—"}
                    </Link>
                  </TableCell>
                  <TableCell>{payment.invoice?.client_name || "—"}</TableCell>
                  <TableCell>
                    {format(new Date(payment.payment_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {MODE_LABELS[payment.payment_mode] ||
                        payment.payment_mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.transaction_id || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{Number(payment.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${STATUS_COLORS[payment.status]} border-0`}
                    >
                      {payment.status}
                    </Badge>
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

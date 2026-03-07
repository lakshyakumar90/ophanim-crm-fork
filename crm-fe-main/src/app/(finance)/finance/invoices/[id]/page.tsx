"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import {
  invoicesApi,
  paymentsApi,
  type Invoice,
  type Payment,
} from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  ArrowLeft,
  Check,
  X,
  Send,
  Plus,
  Mail,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending_approval:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  overdue: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function InvoiceDetailPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: invoice,
    isLoading,
    mutate,
  } = useSWR<Invoice>(user && invoiceId ? ["invoice", invoiceId] : null, () =>
    invoicesApi.get(invoiceId),
  );

  const refreshInvoiceData = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: refreshInvoiceData,
    enabled: Boolean(user && invoiceId),
  });

  const handleApprove = async () => {
    try {
      await invoicesApi.approve(invoiceId);
      toast.success("Invoice approved");
      mutate();
    } catch (error) {
      toast.error("Failed to approve invoice");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await invoicesApi.reject(invoiceId, reason);
      toast.success("Invoice rejected");
      mutate();
    } catch (error) {
      toast.error("Failed to reject invoice");
    }
  };

  const handleSubmit = async () => {
    try {
      await invoicesApi.submit(invoiceId);
      toast.success("Invoice submitted for approval");
      mutate();
    } catch (error) {
      toast.error("Failed to submit invoice");
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await paymentsApi.record(invoiceId, {
        amount: parseFloat(paymentAmount),
        payment_date: paymentDate,
        payment_mode: paymentMode as any,
        transaction_id: transactionId || undefined,
      });
      toast.success("Payment recorded");
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
      setTransactionId("");
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invoice not found</p>
        <Link href="/finance/invoices">
          <Button variant="link">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  const outstanding =
    Number(invoice.total_amount) - Number(invoice.amount_paid);
  const canApprove =
    (isAdmin || isManager) && invoice.status === "pending_approval";
  const canSubmit = invoice.status === "draft";
  const canRecordPayment =
    (isAdmin || isManager) && ["sent", "overdue"].includes(invoice.status);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/finance/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {invoice.invoice_number}
            </h1>
            <p className="text-muted-foreground">{invoice.client_name}</p>
          </div>
          <Badge className={`${STATUS_COLORS[invoice.status]} border-0 ml-2`}>
            {invoice.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="flex gap-2">
          {canSubmit && (
            <Button variant="outline" onClick={handleSubmit}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          {canApprove && (
            <>
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
            </>
          )}
          {canRecordPayment && (
            <Dialog
              open={isPaymentDialogOpen}
              onOpenChange={setIsPaymentDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>
                      Amount (Outstanding: ₹{outstanding.toLocaleString()})
                    </Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      max={outstanding}
                    />
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Transaction ID (Optional)</Label>
                    <Input
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Transaction reference"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleRecordPayment}
                    disabled={isSubmitting}
                  >
                    Record Payment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span>{" "}
              {invoice.client_name}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span>{" "}
              {invoice.client_email}
            </p>
            {invoice.client_phone && (
              <p>
                <span className="text-muted-foreground">Phone:</span>{" "}
                {invoice.client_phone}
              </p>
            )}
            {invoice.client_address && (
              <p>
                <span className="text-muted-foreground">Address:</span>{" "}
                {invoice.client_address}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Date:</span>{" "}
              {format(new Date(invoice.invoice_date), "dd MMM yyyy")}
            </p>
            <p>
              <span className="text-muted-foreground">Due Date:</span>{" "}
              {format(new Date(invoice.due_date), "dd MMM yyyy")}
            </p>
            <p>
              <span className="text-muted-foreground">Terms:</span>{" "}
              {invoice.payment_terms || "Net 30"}
            </p>
            {invoice.lead && (
              <p>
                <span className="text-muted-foreground">Lead:</span>{" "}
                {invoice.lead.lead_name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.line_items?.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    ₹{Number(item.unit_price).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{Number(item.total).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 space-y-2 max-w-xs ml-auto text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{Number(invoice.subtotal).toLocaleString()}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount ({invoice.discount_rate}%)</span>
                <span>
                  -₹{Number(invoice.discount_amount).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Tax ({invoice.tax_rate}%)
              </span>
              <span>₹{Number(invoice.tax_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>₹{Number(invoice.total_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Paid</span>
              <span>₹{Number(invoice.amount_paid).toLocaleString()}</span>
            </div>
            {outstanding > 0 && (
              <div className="flex justify-between font-bold text-rose-600">
                <span>Outstanding</span>
                <span>₹{outstanding.toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.payment_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment.payment_mode.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.transaction_id || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{Number(payment.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {invoice.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Eye, FileText, Loader2, PencilLine, Plus, Printer, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_COLORS, formatCurrency, PAYMENT_MODE_OPTIONS } from "@/lib/invoice-line-item-math";
import type { useInvoiceDetail } from "@/hooks/finance/useInvoiceDetail";
import type { Invoice } from "@/lib/finance-api";

type Detail = ReturnType<typeof useInvoiceDetail>;


export function InvoiceHeader({ detail, invoice }: { detail: Detail; invoice: Invoice }) {
  const {
    isAdmin, isManager, isPreviewLoading, isDownloadingPdf, isPaymentDialogOpen, setIsPaymentDialogOpen,
    paymentAmount, setPaymentAmount, paymentDate, setPaymentDate, paymentMode, setPaymentMode,
    transactionId, setTransactionId, paymentNotes, setPaymentNotes, paymentProofFile, setPaymentProofFile,
    isSubmitting, handleOpenPreview, handleDownloadPdf, handleDeleteInvoice, handleRecordPayment, handleEditSheetChange,
  } = detail;
  const currency = invoice.currency || "INR";
  const outstanding = Math.max(Number(invoice.total_amount) - Number(invoice.amount_paid), 0);
  const canRecordPayment = (isAdmin || isManager) && outstanding > 0 && ["sent", "overdue"].includes(invoice.status);
  const canManageInvoice = isAdmin || isManager;
  const canEditInvoice = canManageInvoice && invoice.status === "draft";

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-4">
        <Link href="/finance/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <FileText className="h-6 w-6 text-primary" />
            {invoice.invoice_number}
          </h1>
          <p className="text-muted-foreground">{invoice.client_name}</p>
        </div>
        <Badge className={`${STATUS_COLORS[invoice.status]} border-0`}>
          {invoice.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {canManageInvoice && (
          <Button
            variant="outline"
            onClick={() => handleEditSheetChange(true)}
            disabled={!canEditInvoice}
          >
            <PencilLine className="mr-2 h-4 w-4" />
            Edit Invoice
          </Button>
        )}

        <Button variant="outline" onClick={handleOpenPreview} disabled={isPreviewLoading}>
          {isPreviewLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Eye className="mr-2 h-4 w-4" />
          )}
          Preview Invoice
        </Button>

        <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
          {isDownloadingPdf ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Printer className="mr-2 h-4 w-4" />
          )}
          Download PDF
        </Button>

        {isAdmin && (
          <Button
            variant="outline"
            className="text-destructive"
            onClick={handleDeleteInvoice}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Invoice
          </Button>
        )}

        {canRecordPayment && (
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
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
                    Amount ({formatCurrency(outstanding, currency)} outstanding)
                  </Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
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
                  <Label>Payment Method</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transaction ID</Label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Transaction reference"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transaction Proof</Label>
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a receipt, screenshot, or gateway confirmation for this payment.
                  </p>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Optional notes for this transaction"
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleRecordPayment}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Record Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>

  );
}

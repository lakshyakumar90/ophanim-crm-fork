"use client";

import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoiceDetail } from "@/hooks/finance/useInvoiceDetail";
import { InvoiceHeader } from "@/components/finance/invoices/InvoiceHeader";
import { InvoiceLineItemsTable } from "@/components/finance/invoices/InvoiceLineItemsTable";
import { InvoicePaymentsPanel } from "@/components/finance/invoices/InvoicePaymentsPanel";
import { InvoiceEditSheet } from "@/components/finance/invoices/InvoiceEditSheet";
import { FormSideSheet } from "@/components/ui/form-side-sheet";

export function InvoiceDetailBody({ invoiceId }: { invoiceId: string }) {
  const detail = useInvoiceDetail(invoiceId);
  const { invoice, isLoading, isAdmin, isManager } = detail;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return <p className="text-muted-foreground text-sm">Invoice not found.</p>;
  }

  const currency = invoice.currency || "INR";
  const canManageInvoice = isAdmin || isManager;
  const canEditInvoice = canManageInvoice && invoice.status === "draft";

  return (
    <div className="space-y-5">
      <InvoiceHeader detail={detail} invoice={invoice} embedded />

      {canManageInvoice && !canEditInvoice && (
        <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Only draft invoices can be edited. Status:{" "}
          <span className="font-medium capitalize text-foreground">
            {invoice.status.replace("_", " ")}
          </span>
        </div>
      )}

      <div className="grid gap-4 text-sm">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{invoice.client_name}</p>
            <p className="text-muted-foreground">{invoice.client_email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Date: {format(new Date(invoice.invoice_date), "dd MMM yyyy")}
            </p>
            <p>Due: {format(new Date(invoice.due_date), "dd MMM yyyy")}</p>
            <p>Currency: {currency}</p>
          </CardContent>
        </Card>
      </div>

      <InvoiceLineItemsTable invoice={invoice} />
      <InvoicePaymentsPanel invoice={invoice} />
      <InvoiceEditSheet detail={detail} invoice={invoice} />
    </div>
  );
}

export function InvoiceDetailSheet({
  invoiceId,
  open,
  onOpenChange,
}: {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Invoice"
      size="3xl"
      className="sm:w-[min(100%,56rem)]"
    >
      {invoiceId && open ? <InvoiceDetailBody invoiceId={invoiceId} /> : null}
    </FormSideSheet>
  );
}

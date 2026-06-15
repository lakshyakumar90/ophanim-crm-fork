"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoiceDetail } from "@/hooks/finance/useInvoiceDetail";
import { InvoiceHeader } from "@/components/finance/invoices/InvoiceHeader";
import { InvoiceLineItemsTable } from "@/components/finance/invoices/InvoiceLineItemsTable";
import { InvoicePaymentsPanel } from "@/components/finance/invoices/InvoicePaymentsPanel";
import { InvoiceEditSheet } from "@/components/finance/invoices/InvoiceEditSheet";

export default function InvoiceDetailPage() {
  const detail = useInvoiceDetail();
  const { invoice, isLoading, isAdmin, isManager } = detail;

  if (isLoading) {
    return (
      <div className="max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Invoice not found</p>
        <Link href="/finance/invoices">
          <Button variant="link">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  const currency = invoice.currency || "INR";
  const canManageInvoice = isAdmin || isManager;
  const canEditInvoice = canManageInvoice && invoice.status === "draft";

  return (
    <div className="max-w-6xl space-y-6">
      <InvoiceHeader detail={detail} invoice={invoice} />

      {canManageInvoice && !canEditInvoice && (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Only draft invoices can be edited. This invoice is currently marked as{" "}
          <span className="font-medium capitalize text-foreground">
            {invoice.status.replace("_", " ")}
          </span>
          .
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Client Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Name:</span> {invoice.client_name}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {invoice.client_email}
            </p>
            {invoice.client_phone && (
              <p>
                <span className="text-muted-foreground">Phone:</span> {invoice.client_phone}
              </p>
            )}
            {invoice.client_address && (
              <p>
                <span className="text-muted-foreground">Address:</span> {invoice.client_address}
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
              <span className="text-muted-foreground">Invoice ID:</span>{" "}
              {invoice.invoice_number} / {invoice.id.slice(0, 8).toUpperCase()}
            </p>
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
            <p>
              <span className="text-muted-foreground">Currency:</span> {currency}
            </p>
            {invoice.lead && (
              <p>
                <span className="text-muted-foreground">Lead:</span> {invoice.lead.lead_name}
                {(invoice.lead as { business_name?: string }).business_name
                  ? ` - ${(invoice.lead as { business_name?: string }).business_name}`
                  : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <InvoiceLineItemsTable invoice={invoice} />
      <InvoicePaymentsPanel invoice={invoice} />

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      <InvoiceEditSheet detail={detail} invoice={invoice} />
    </div>
  );
}

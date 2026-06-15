"use client";

import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, getPaymentModeLabel } from "@/lib/invoice-line-item-math";
import type { Invoice } from "@/lib/finance-api";

export function InvoicePaymentsPanel({ invoice }: { invoice: Invoice }) {
  const currency = invoice.currency || "INR";
  if (!invoice.payments?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  {format(new Date(payment.payment_date), "dd MMM yyyy")}
                </TableCell>
                <TableCell>{getPaymentModeLabel(payment.payment_mode)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {payment.transaction_id || "—"}
                </TableCell>
                <TableCell>
                  {payment.transaction_proof_url ? (
                    <a
                      href={payment.transaction_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {payment.transaction_proof_name || "View proof"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(Number(payment.amount), currency)}
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
  );
}

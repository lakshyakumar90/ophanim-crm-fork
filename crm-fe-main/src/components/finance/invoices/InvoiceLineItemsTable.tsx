"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, getItemDiscountLabel, getMergedPlanDescription, getOriginalAmount } from "@/lib/invoice-line-item-math";
import type { Invoice } from "@/lib/finance-api";

export function InvoiceLineItemsTable({ invoice }: { invoice: Invoice }) {
  const currency = invoice.currency || "INR";
  const outstanding = Math.max(Number(invoice.total_amount) - Number(invoice.amount_paid), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Line Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Plan &amp; Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Original Amount</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.line_items?.map((item, index) => {
              const discountLabel = getItemDiscountLabel(item);
              const [discountAmount, discountMeta] =
                discountLabel === "—" ? ["—", ""] : discountLabel.split("|");

              return (
                <TableRow key={item.id || index}>
                  <TableCell>{item.service_name || "—"}</TableCell>
                  <TableCell>{getMergedPlanDescription(item)}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(getOriginalAmount(item), currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {discountAmount === "—" ? (
                      "—"
                    ) : (
                      <div className="space-y-1">
                        <div>{formatCurrency(Number(discountAmount), currency)}</div>
                        {discountMeta ? (
                          <div className="text-xs text-muted-foreground">{discountMeta}</div>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(item.total), currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

          <div className="ml-auto max-w-sm space-y-2 rounded-xl border bg-muted/20 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal), currency)}</span>
            </div>
          {Number(invoice.discount_amount) > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Discount ({invoice.discount_rate}%)</span>
              <span>- {formatCurrency(Number(invoice.discount_amount), currency)}</span>
            </div>
          )}
          {Number(invoice.tax_amount) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
              <span>{formatCurrency(Number(invoice.tax_amount), currency)}</span>
            </div>
          )}
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(Number(invoice.total_amount), currency)}</span>
            </div>
            {Number(invoice.amount_paid) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Payment Made</span>
                <span>(-) {formatCurrency(Number(invoice.amount_paid), currency)}</span>
              </div>
            )}
            {outstanding > 0 && (
              <div className="flex justify-between font-bold text-rose-600">
                <span>Balance Due</span>
                <span>{formatCurrency(outstanding, currency)}</span>
              </div>
            )}
        </div>
      </CardContent>
    </Card>

  );
}

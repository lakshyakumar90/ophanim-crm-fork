"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CurrencyCode, Invoice, PaymentMode } from "@/lib/finance-api";
import {
  CURRENCY_OPTIONS, STATUS_COLORS, formatCurrency, getEditBaseAmount, getEditItemDiscountAmount, getEditLineTotal,
} from "@/lib/invoice-line-item-math";
import type { useInvoiceDetail } from "@/hooks/finance/useInvoiceDetail";
import type { LineItemInput } from "@/lib/invoice-line-item-math";

type Detail = ReturnType<typeof useInvoiceDetail>;


export function InvoiceEditSheet({ detail, invoice }: { detail: Detail; invoice: Invoice }) {
  const {
    isEditSheetOpen, handleEditSheetChange, editForm, editInvoiceStatus, setEditInvoiceStatus,
    editPaymentAmount, setEditPaymentAmount, editPaymentDate, setEditPaymentDate, editPaymentMode, setEditPaymentMode,
    editPaymentTransactionId, setEditPaymentTransactionId, editPaymentNotes, setEditPaymentNotes,
    updateEditField, updateEditLineItem, addEditLineItem, removeEditLineItem, handleSaveInvoice, isSavingInvoice,
    editSubtotal, editDiscountAmount, editTaxAmount, editTotalAmount,
  } = detail;
  return (
    <Sheet open={isEditSheetOpen} onOpenChange={handleEditSheetChange}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-3xl">
        <SheetHeader className="gap-2 border-b px-6 py-5 sm:px-8">
          <SheetTitle>Edit Invoice</SheetTitle>
          <SheetDescription>
            Update client details, invoice settings, and line items from this side panel.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {editForm ? (
            <div className="space-y-8 px-6 py-6 sm:px-8">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.id.slice(0, 8).toUpperCase()} / {invoice.status.replace("_", " ")}
                    </p>
                  </div>
                  <Badge className={`${STATUS_COLORS[invoice.status]} border-0 w-fit`}>
                    {invoice.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              <section className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Client Information</h2>
                  <p className="text-sm text-muted-foreground">
                    Keep this aligned with the billing contact shown on the invoice.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Input
                      value={editForm.client_name}
                      onChange={(e) => updateEditField("client_name", e.target.value)}
                      placeholder="Client or business name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Email</Label>
                    <Input
                      type="email"
                      value={editForm.client_email}
                      onChange={(e) => updateEditField("client_email", e.target.value)}
                      placeholder="billing@client.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Phone</Label>
                    <Input
                      value={editForm.client_phone}
                      onChange={(e) => updateEditField("client_phone", e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Input
                      value={editForm.payment_terms}
                      onChange={(e) => updateEditField("payment_terms", e.target.value)}
                      placeholder="Net 30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Client Address</Label>
                  <Textarea
                    value={editForm.client_address}
                    onChange={(e) => updateEditField("client_address", e.target.value)}
                    placeholder="Billing address"
                    rows={3}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Invoice Details</h2>
                  <p className="text-sm text-muted-foreground">
                    Control dates, currency, and invoice-level pricing adjustments.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Invoice Date</Label>
                    <Input
                      type="date"
                      value={editForm.invoice_date}
                      onChange={(e) => updateEditField("invoice_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={editForm.due_date}
                      onChange={(e) => updateEditField("due_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={editForm.currency}
                      onValueChange={(value) =>
                        updateEditField("currency", value as CurrencyCode)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editInvoiceStatus}
                      onValueChange={(value) =>
                        setEditInvoiceStatus(value as "draft" | "sent")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.tax_rate}
                      onChange={(e) =>
                        updateEditField("tax_rate", Number.parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Discount (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.discount_rate}
                      onChange={(e) =>
                        updateEditField("discount_rate", Number.parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Payment (Optional)</h2>
                  <p className="text-sm text-muted-foreground">
                    Add a payment while saving this invoice. Payments are not shown on the
                    invoice layout itself.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Payment Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editPaymentAmount}
                      onChange={(e) => setEditPaymentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={editPaymentDate}
                      onChange={(e) => setEditPaymentDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={editPaymentMode}
                      onValueChange={(value) => setEditPaymentMode(value as PaymentMode)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference ID</Label>
                    <Input
                      value={editPaymentTransactionId}
                      onChange={(e) => setEditPaymentTransactionId(e.target.value)}
                      placeholder="Transaction reference"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Notes</Label>
                  <Textarea
                    value={editPaymentNotes}
                    onChange={(e) => setEditPaymentNotes(e.target.value)}
                    placeholder="Optional payment note"
                    rows={3}
                  />
                </div>

                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  To record a payment from this panel, save the invoice as{" "}
                  <span className="font-medium text-foreground">Sent</span>. Draft invoices stay
                  editable but cannot accept payments.
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Line Items</h2>
                    <p className="text-sm text-muted-foreground">
                      Edit original amounts and discounts while keeping the final amount visible.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={addEditLineItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {editForm.line_items.map((item, index) => {
                    const baseAmount = getEditBaseAmount(item);
                    const itemDiscountAmount = getEditItemDiscountAmount(item);
                    const lineTotal = getEditLineTotal(item);

                    return (
                      <div key={index} className="rounded-2xl border bg-card p-4 sm:p-5">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-foreground">Item {index + 1}</p>
                            <p className="text-sm text-muted-foreground">
                              Service, description, quantity, and discount configuration.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEditLineItem(index)}
                            disabled={editForm.line_items.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Service</Label>
                            <Input
                              value={item.service_name}
                              onChange={(e) =>
                                updateEditLineItem(index, "service_name", e.target.value)
                              }
                              placeholder="SEO"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Plan</Label>
                            <Input
                              value={item.plan_name}
                              onChange={(e) =>
                                updateEditLineItem(index, "plan_name", e.target.value)
                              }
                              placeholder="Platinum Plan"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                updateEditLineItem(index, "description", e.target.value)
                              }
                              placeholder="Optional item description"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                updateEditLineItem(
                                  index,
                                  "quantity",
                                  Number.parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit Price</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateEditLineItem(
                                  index,
                                  "unit_price",
                                  Number.parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Original Amount</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.original_amount}
                              onChange={(e) =>
                                updateEditLineItem(
                                  index,
                                  "original_amount",
                                  Number.parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Item Discount</Label>
                            <Select
                              value={item.item_discount_type}
                              onValueChange={(value) =>
                                updateEditLineItem(
                                  index,
                                  "item_discount_type",
                                  value as LineItemInput["item_discount_type"],
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Discount</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {item.item_discount_type !== "none" && (
                            <div className="space-y-2">
                              <Label>
                                {item.item_discount_type === "percentage"
                                  ? "Discount %"
                                  : "Discount Amount"}
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.item_discount_value}
                                onChange={(e) =>
                                  updateEditLineItem(
                                    index,
                                    "item_discount_value",
                                    Number.parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-muted/20 p-4 text-sm md:grid-cols-4">
                          <div>
                            <span className="text-muted-foreground">Base Amount</span>
                            <p className="font-medium">
                              {formatCurrency(baseAmount, editForm.currency)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Original Amount</span>
                            <p className="font-medium">
                              {formatCurrency(
                                Number(item.original_amount || 0) || baseAmount,
                                editForm.currency,
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Item Discount</span>
                            <p className="font-medium text-rose-600">
                              {itemDiscountAmount > 0
                                ? `- ${formatCurrency(itemDiscountAmount, editForm.currency)}`
                                : "Not applied"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Final Amount</span>
                            <p className="font-semibold">
                              {formatCurrency(lineTotal, editForm.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Notes</h2>
                  <p className="text-sm text-muted-foreground">
                    Add anything the client or team should see on the invoice.
                  </p>
                </div>

                <Textarea
                  value={editForm.notes}
                  onChange={(e) => updateEditField("notes", e.target.value)}
                  placeholder="Optional invoice notes"
                  rows={5}
                />
              </section>

              <section className="rounded-2xl border bg-muted/20 p-5">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-foreground">Totals Preview</h2>
                  <p className="text-sm text-muted-foreground">
                    This preview updates as you edit the invoice.
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(editSubtotal, editForm.currency)}</span>
                  </div>
                  {editDiscountAmount > 0 && (
                    <div className="flex justify-between gap-4 text-rose-600">
                      <span>Discount ({editForm.discount_rate}%)</span>
                      <span>- {formatCurrency(editDiscountAmount, editForm.currency)}</span>
                    </div>
                  )}
                  {editTaxAmount > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Tax ({editForm.tax_rate}%)</span>
                      <span>{formatCurrency(editTaxAmount, editForm.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(editTotalAmount, editForm.currency)}</span>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleEditSheetChange(false)}
            disabled={isSavingInvoice}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveInvoice} disabled={isSavingInvoice}>
            {isSavingInvoice ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

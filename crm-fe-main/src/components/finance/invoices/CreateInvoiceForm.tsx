"use client";

import Link from "next/link";
import { Controller } from "react-hook-form";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CurrencyCode, PaymentMode } from "@/lib/finance-api";
import {
  CURRENCY_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
} from "@/lib/finance/invoice-form-schema";
import { useCreateInvoiceForm } from "@/hooks/finance/useCreateInvoiceForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function CreateInvoiceForm() {
  const {
    register,
    control,
    isSubmitting,
    leadPickerOpen,
    setLeadPickerOpen,
    wonLeads,
    leadsLoading,
    selectedLead,
    leadId,
    currency,
    discountRate,
    taxRate,
    lineItems,
    lineItemFields,
    totals,
    handleLeadChange,
    addLineItem,
    removeLineItem,
    onSubmit,
    getCreateBaseAmount,
    getCreateItemDiscountAmount,
    getCreateLineTotal,
    formatCurrency,
    getLeadName,
    getLeadBusiness,
    getLeadEmail,
  } = useCreateInvoiceForm();

  const { subtotal, discountAmount, taxAmount, totalAmount } = totals;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Link Won Lead</Label>
            <Popover open={leadPickerOpen} onOpenChange={setLeadPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={leadPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedLead
                    ? `${getLeadName(selectedLead)}${getLeadBusiness(selectedLead) ? ` - ${getLeadBusiness(selectedLead)}` : ""}`
                    : "Search won leads..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search won leads..." />
                  <CommandList>
                    <CommandEmpty>
                      {leadsLoading ? "Loading won leads..." : "No won lead found."}
                    </CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="no-linked-lead"
                        onSelect={() => {
                          handleLeadChange("");
                          setLeadPickerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !leadId ? "opacity-100" : "opacity-0",
                          )}
                        />
                        No linked lead
                      </CommandItem>
                      {wonLeads.map((lead: { id: string }) => {
                        const label = `${getLeadName(lead)} ${getLeadBusiness(lead)} ${getLeadEmail(lead)}`;
                        return (
                          <CommandItem
                            key={lead.id}
                            value={label}
                            onSelect={() => {
                              handleLeadChange(lead.id);
                              setLeadPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                leadId === lead.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate">{getLeadName(lead)}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                {getLeadBusiness(lead) || getLeadEmail(lead) || "Won lead"}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Only won leads are available here so invoicing stays tied to closed business.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register("client_name")}
                placeholder="Company or client name"
              />
            </div>
            <div>
              <Label>
                Client Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                {...register("client_email")}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <Label>Client Phone</Label>
              <Input {...register("client_phone")} placeholder="+1 555 000 1234" />
            </div>
            <div>
              <Label>Client Address</Label>
              <Input {...register("client_address")} placeholder="Billing address" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <Label>Invoice Date</Label>
            <Input type="date" {...register("invoice_date")} />
          </div>
          <div>
            <Label>
              Due Date <span className="text-destructive">*</span>
            </Label>
            <Input type="date" {...register("due_date")} />
          </div>
          <div>
            <Label>Currency</Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as CurrencyCode)}
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
              )}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Controller
              control={control}
              name="invoice_status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as "draft" | "sent")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Draft keeps the invoice editable. Sent marks it as already issued to the client.
            </p>
          </div>
          <div>
            <Label>Payment Terms</Label>
            <Controller
              control={control}
              name="payment_terms"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label>Payment Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                {...register("payment_amount")}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" {...register("payment_date")} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Controller
                control={control}
                name="payment_mode"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as PaymentMode)}
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
                )}
              />
            </div>
            <div>
              <Label>Reference ID</Label>
              <Input
                {...register("payment_transaction_id")}
                placeholder="Transaction reference"
              />
            </div>
          </div>

          <div>
            <Label>Payment Notes</Label>
            <Textarea
              {...register("payment_notes")}
              placeholder="Optional payment note"
              rows={3}
            />
          </div>

          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Payments are not printed on the invoice. To record a payment here, set the invoice
            status to <span className="font-medium text-foreground">Sent</span>.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button variant="outline" size="sm" type="button" onClick={addLineItem}>
            <Plus className="mr-1 h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItemFields.map((field, index) => {
            const item = lineItems[index];
            if (!item) return null;

            const baseAmount = getCreateBaseAmount(item);
            const itemDiscountAmount = getCreateItemDiscountAmount(item);
            const lineTotal = getCreateLineTotal(item);

            return (
              <div key={field.id} className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Item {index + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      Service, plan, original amount, and optional item discount.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <Label>Service</Label>
                    <Input
                      {...register(`line_items.${index}.service_name`)}
                      placeholder="SEO"
                    />
                  </div>
                  <div>
                    <Label>Plan</Label>
                    <Input
                      {...register(`line_items.${index}.plan_name`)}
                      placeholder="Gold Plan"
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <Label>Description</Label>
                    <Input
                      {...register(`line_items.${index}.description`)}
                      placeholder="Optional additional item description"
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      {...register(`line_items.${index}.quantity`, {
                        setValueAs: (value) => Number.parseFloat(value) || 0,
                      })}
                    />
                  </div>
                  <div>
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register(`line_items.${index}.unit_price`, {
                        setValueAs: (value) => Number.parseFloat(value) || 0,
                      })}
                    />
                  </div>
                  <div>
                    <Label>Original Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register(`line_items.${index}.original_amount`, {
                        setValueAs: (value) => Number.parseFloat(value) || 0,
                      })}
                    />
                  </div>
                  <div>
                    <Label>Item Discount</Label>
                    <Controller
                      control={control}
                      name={`line_items.${index}.item_discount_type`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Discount</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {item.item_discount_type !== "none" && (
                    <div>
                      <Label>
                        {item.item_discount_type === "percentage"
                          ? "Discount %"
                          : "Discount Amount"}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`line_items.${index}.item_discount_value`, {
                          setValueAs: (value) => Number.parseFloat(value) || 0,
                        })}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-background p-3 text-sm md:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Base Amount</span>
                    <p className="font-medium">{formatCurrency(baseAmount, currency)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Original Amount</span>
                    <p className="font-medium">
                      {formatCurrency(item.original_amount || baseAmount, currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Item Discount</span>
                    <p className="font-medium text-rose-600">
                      {itemDiscountAmount > 0
                        ? `- ${formatCurrency(itemDiscountAmount, currency)}`
                        : "Not applied"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Line Total</span>
                    <p className="font-semibold text-primary">
                      {formatCurrency(lineTotal, currency)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="ml-auto max-w-sm space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Invoice Discount (%)</span>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="h-8 w-24 text-right"
                {...register("discount_rate", {
                  setValueAs: (value) => Number.parseFloat(value) || 0,
                })}
              />
            </div>
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-rose-600">
                <span>Discount</span>
                <span>- {formatCurrency(discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Tax (%)</span>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="h-8 w-24 text-right"
                {...register("tax_rate", {
                  setValueAs: (value) => Number.parseFloat(value) || 0,
                })}
              />
            </div>
            {taxAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax Amount</span>
                <span>{formatCurrency(taxAmount, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(totalAmount, currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("notes")}
            placeholder="Additional notes or client-facing payment instructions..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/finance/invoices">
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        <Button onClick={onSubmit} disabled={isSubmitting} type="button">
          <Check className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>
    </>
  );
}

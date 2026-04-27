"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  invoicesApi,
  paymentsApi,
  type CurrencyCode,
  type InvoiceLineItem,
  type PaymentMode,
} from "@/lib/finance-api";
import { leadsApi } from "@/lib/api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
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
import {
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type LineItemInput = {
  description: string;
  service_name: string;
  plan_name: string;
  quantity: number;
  unit_price: number;
  original_amount: number;
  item_discount_type: "none" | "percentage" | "fixed";
  item_discount_value: number;
};

const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "CAD", "GBP", "EUR", "INR"];

const emptyLineItem = (): LineItemInput => ({
  description: "",
  service_name: "",
  plan_name: "",
  quantity: 1,
  unit_price: 0,
  original_amount: 0,
  item_discount_type: "none",
  item_discount_value: 0,
});

function getLeadName(lead: any) {
  return lead?.leadName || lead?.lead_name || "Unnamed lead";
}

function getLeadBusiness(lead: any) {
  return lead?.businessName || lead?.business_name || lead?.company_name || "";
}

function getLeadEmail(lead: any) {
  return lead?.email || "";
}

function getLeadPhone(lead: any) {
  return lead?.phone || "";
}

function formatCurrency(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export default function NewInvoicePage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadPickerOpen, setLeadPickerOpen] = useState(false);

  const [leadId, setLeadId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [invoiceStatus, setInvoiceStatus] = useState<"draft" | "sent">("draft");
  const [taxRate, setTaxRate] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [notes, setNotes] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("bank_transfer");
  const [paymentTransactionId, setPaymentTransactionId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemInput[]>([emptyLineItem()]);

  const { data: wonLeadsData, isLoading: leadsLoading } = useSWR(
    user ? "won-leads-for-invoices" : null,
    () => leadsApi.getWonLeads(),
  );

  const wonLeads = useMemo(() => {
    if (Array.isArray(wonLeadsData)) return wonLeadsData;
    return wonLeadsData?.data || [];
  }, [wonLeadsData]);

  const selectedLead = wonLeads.find((lead: any) => lead.id === leadId);

  const handleLeadChange = (id: string) => {
    if (!id) {
      setLeadId("");
      return;
    }

    setLeadId(id);
    const lead = wonLeads.find((entry: any) => entry.id === id);
    if (!lead) return;

    setClientName(getLeadBusiness(lead) || getLeadName(lead) || "");
    setClientEmail(getLeadEmail(lead));
    setClientPhone(getLeadPhone(lead));
  };

  const addLineItem = () => {
    setLineItems((current) => [...current, emptyLineItem()]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateLineItem = <K extends keyof LineItemInput>(
    index: number,
    field: K,
    value: LineItemInput[K],
  ) => {
    setLineItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const getBaseAmount = (item: LineItemInput) => item.quantity * item.unit_price;

  const getItemDiscountAmount = (item: LineItemInput) => {
    const baseAmount = getBaseAmount(item);
    if (item.item_discount_type === "percentage") {
      return (baseAmount * item.item_discount_value) / 100;
    }
    if (item.item_discount_type === "fixed") {
      return item.item_discount_value;
    }
    return 0;
  };

  const getLineTotal = (item: LineItemInput) =>
    Math.max(getBaseAmount(item) - getItemDiscountAmount(item), 0);

  const subtotal = lineItems.reduce((sum, item) => sum + getLineTotal(item), 0);
  const discountAmount = subtotal * (discountRate / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const totalAmount = taxableAmount + taxAmount;

  const canCreateInvoice = isAdmin || isManager;

  const handleSubmit = async () => {
    if (!clientName.trim() || !clientEmail.trim() || !dueDate) {
      toast.error("Please fill in the client details and due date");
      return;
    }

    const invalidItem = lineItems.find((item) => {
      const hasDescriptor =
        item.description.trim() || item.service_name.trim() || item.plan_name.trim();
      return !hasDescriptor || item.quantity <= 0 || item.unit_price < 0;
    });

    if (invalidItem) {
      toast.error("Each invoice item needs a service, plan, or description");
      return;
    }

    const initialPaymentAmount = Number.parseFloat(paymentAmount) || 0;
    if (initialPaymentAmount > 0 && invoiceStatus === "draft") {
      toast.error("Set the invoice status to Sent before adding a payment");
      return;
    }

    if (initialPaymentAmount > totalAmount) {
      toast.error("Payment amount cannot be more than the invoice total");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: {
        lead_id?: string;
        client_name: string;
        client_email: string;
        client_phone?: string;
        client_address?: string;
        invoice_date: string;
        due_date: string;
        currency: CurrencyCode;
        status: "draft" | "sent";
        tax_rate: number;
        discount_rate: number;
        payment_terms: string;
        notes?: string;
        line_items: InvoiceLineItem[];
      } = {
        lead_id: leadId || undefined,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || undefined,
        client_address: clientAddress.trim() || undefined,
        invoice_date: invoiceDate,
        due_date: dueDate,
        currency,
        status: invoiceStatus,
        tax_rate: taxRate,
        discount_rate: discountRate,
        payment_terms: paymentTerms,
        notes: notes.trim() || undefined,
        line_items: lineItems.map((item) => {
          const description =
            item.description.trim() ||
            [item.service_name.trim(), item.plan_name.trim()]
              .filter(Boolean)
              .join(" - ");
          const baseAmount = getBaseAmount(item);
          const lineTotal = getLineTotal(item);

          return {
            description,
            service_name: item.service_name.trim() || undefined,
            plan_name: item.plan_name.trim() || undefined,
            quantity: item.quantity,
            unit_price: item.unit_price,
            original_amount: item.original_amount > 0 ? item.original_amount : baseAmount,
            item_discount_type: item.item_discount_type,
            item_discount_value:
              item.item_discount_type === "none" ? 0 : item.item_discount_value,
            total: lineTotal,
          };
        }),
      };

      const response = await invoicesApi.create(payload);
      const invoiceId = response.data.data.id;

      if (initialPaymentAmount > 0) {
        await paymentsApi.record(invoiceId, {
          amount: initialPaymentAmount,
          payment_date: paymentDate,
          payment_mode: paymentMode,
          transaction_id: paymentTransactionId.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
        });
      }

      toast.success(
        initialPaymentAmount > 0 ? "Invoice and payment created" : "Invoice created",
      );

      router.push(`/finance/invoices/${invoiceId}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to create invoice or record the initial payment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreateInvoice) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Invoice Access Restricted</h1>
        <p className="text-muted-foreground">
          Only admins and managers can create invoices.
        </p>
        <Link href="/finance/invoices">
          <Button variant="outline">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/finance/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <FileText className="h-6 w-6 text-primary" />
            New Invoice
          </h1>
          <p className="text-muted-foreground">
            Create a client-ready invoice with service, plan, discounts, and currency.
          </p>
        </div>
      </div>

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
                      {wonLeads.map((lead: any) => {
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
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Company or client name"
              />
            </div>
            <div>
              <Label>
                Client Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <Label>Client Phone</Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+1 555 000 1234"
              />
            </div>
            <div>
              <Label>Client Address</Label>
              <Input
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Billing address"
              />
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
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div>
            <Label>
              Due Date <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)}>
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
          <div>
            <Label>Status</Label>
            <Select
              value={invoiceStatus}
              onValueChange={(value) => setInvoiceStatus(value as "draft" | "sent")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              Draft keeps the invoice editable. Sent marks it as already issued to the client.
            </p>
          </div>
          <div>
            <Label>Payment Terms</Label>
            <Select value={paymentTerms} onValueChange={setPaymentTerms}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                <SelectItem value="Net 15">Net 15</SelectItem>
                <SelectItem value="Net 30">Net 30</SelectItem>
                <SelectItem value="Net 45">Net 45</SelectItem>
                <SelectItem value="Net 60">Net 60</SelectItem>
              </SelectContent>
            </Select>
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
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
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
              <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMode)}>
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
            <div>
              <Label>Reference ID</Label>
              <Input
                value={paymentTransactionId}
                onChange={(e) => setPaymentTransactionId(e.target.value)}
                placeholder="Transaction reference"
              />
            </div>
          </div>

          <div>
            <Label>Payment Notes</Label>
            <Textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
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
          <Button variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="mr-1 h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((item, index) => {
            const baseAmount = getBaseAmount(item);
            const itemDiscountAmount = getItemDiscountAmount(item);
            const lineTotal = getLineTotal(item);

            return (
              <div key={index} className="rounded-xl border bg-muted/30 p-4">
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
                      value={item.service_name}
                      onChange={(e) =>
                        updateLineItem(index, "service_name", e.target.value)
                      }
                      placeholder="SEO"
                    />
                  </div>
                  <div>
                    <Label>Plan</Label>
                    <Input
                      value={item.plan_name}
                      onChange={(e) => updateLineItem(index, "plan_name", e.target.value)}
                      placeholder="Gold Plan"
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, "description", e.target.value)
                      }
                      placeholder="Optional additional item description"
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "quantity",
                          Number.parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "unit_price",
                          Number.parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Original Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.original_amount}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "original_amount",
                          Number.parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Item Discount</Label>
                    <Select
                      value={item.item_discount_type}
                      onValueChange={(value) =>
                        updateLineItem(
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
                        value={item.item_discount_value}
                        onChange={(e) =>
                          updateLineItem(
                            index,
                            "item_discount_value",
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
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
                value={discountRate}
                onChange={(e) => setDiscountRate(Number.parseFloat(e.target.value) || 0)}
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
                value={taxRate}
                onChange={(e) => setTaxRate(Number.parseFloat(e.target.value) || 0)}
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or client-facing payment instructions..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/finance/invoices">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Check className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>
    </div>
  );
}

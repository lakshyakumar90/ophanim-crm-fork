import type { CurrencyCode, Invoice, InvoiceLineItem } from "@/lib/finance-api";

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  overdue: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  cancelled: "bg-secondary text-secondary-foreground",
};

export const PAYMENT_MODE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "paypal", label: "PayPal" },
  { value: "stripe", label: "Stripe" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;

export const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "CAD", "GBP", "EUR", "INR"];

export type LineItemInput = {
  description: string;
  service_name: string;
  plan_name: string;
  quantity: number;
  unit_price: number;
  original_amount: number;
  item_discount_type: "none" | "percentage" | "fixed";
  item_discount_value: number;
};

export type InvoiceEditForm = {
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  invoice_date: string;
  due_date: string;
  currency: CurrencyCode;
  tax_rate: number;
  discount_rate: number;
  payment_terms: string;
  notes: string;
  line_items: LineItemInput[];
};

export const emptyLineItem = (): LineItemInput => ({
  description: "",
  service_name: "",
  plan_name: "",
  quantity: 1,
  unit_price: 0,
  original_amount: 0,
  item_discount_type: "none",
  item_discount_value: 0,
});

export function formatCurrency(amount: number, currency: CurrencyCode = "INR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function getPaymentModeLabel(mode?: string) {
  return PAYMENT_MODE_OPTIONS.find((item) => item.value === mode)?.label || mode || "-";
}

export function getMergedPlanDescription(item: NonNullable<Invoice["line_items"]>[number]) {
  const parts = [item.service_name, item.plan_name, item.description]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  const uniqueParts: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const normalized = part.replace(/\s+/g, " ").toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    uniqueParts.push(part);
  }

  return uniqueParts.join(" - ") || "—";
}

export function getOriginalAmount(item: NonNullable<Invoice["line_items"]>[number]) {
  const configuredAmount = Number(item.original_amount || 0);
  if (configuredAmount > 0) return configuredAmount;
  return Number(item.quantity || 0) * Number(item.unit_price || 0);
}

export function getItemDiscountAmount(item: NonNullable<Invoice["line_items"]>[number]) {
  const originalAmount = getOriginalAmount(item);
  const discountType = item.item_discount_type || "none";
  const discountValue = Number(item.item_discount_value || 0);

  if (discountType === "percentage") {
    return (originalAmount * discountValue) / 100;
  }

  if (discountType === "fixed") {
    return discountValue;
  }

  return Math.max(originalAmount - Number(item.total || 0), 0);
}

export function getItemDiscountLabel(item: NonNullable<Invoice["line_items"]>[number]) {
  const discountAmount = getItemDiscountAmount(item);
  if (discountAmount <= 0) return "—";

  if (item.item_discount_type === "percentage") {
    return `${discountAmount}|${Number(item.item_discount_value || 0)}%`;
  }

  if (item.item_discount_type === "fixed") {
    return `${discountAmount}|Fixed`;
  }

  return `${discountAmount}`;
}

export function createLineItemInput(item?: InvoiceLineItem): LineItemInput {
  const quantity = Number(item?.quantity || 1);
  const unitPrice = Number(item?.unit_price || 0);
  const originalAmount = Number(item?.original_amount || 0);

  return {
    description: item?.description || "",
    service_name: item?.service_name || "",
    plan_name: item?.plan_name || "",
    quantity,
    unit_price: unitPrice,
    original_amount: originalAmount > 0 ? originalAmount : quantity * unitPrice,
    item_discount_type: item?.item_discount_type || "none",
    item_discount_value: Number(item?.item_discount_value || 0),
  };
}

export function createInvoiceEditForm(invoice: Invoice): InvoiceEditForm {
  return {
    client_name: invoice.client_name || "",
    client_email: invoice.client_email || "",
    client_phone: invoice.client_phone || "",
    client_address: invoice.client_address || "",
    invoice_date: invoice.invoice_date ? invoice.invoice_date.split("T")[0] : "",
    due_date: invoice.due_date ? invoice.due_date.split("T")[0] : "",
    currency: invoice.currency || "INR",
    tax_rate: Number(invoice.tax_rate || 0),
    discount_rate: Number(invoice.discount_rate || 0),
    payment_terms: invoice.payment_terms || "Net 30",
    notes: invoice.notes || "",
    line_items:
      invoice.line_items && invoice.line_items.length > 0
        ? invoice.line_items.map((item) => createLineItemInput(item))
        : [emptyLineItem()],
  };
}

export function getEditBaseAmount(item: LineItemInput) {
  return Number(item.quantity || 0) * Number(item.unit_price || 0);
}

export function getEditItemDiscountAmount(item: LineItemInput) {
  const originalAmount = Number(item.original_amount || 0) || getEditBaseAmount(item);

  if (item.item_discount_type === "percentage") {
    return (originalAmount * Number(item.item_discount_value || 0)) / 100;
  }

  if (item.item_discount_type === "fixed") {
    return Number(item.item_discount_value || 0);
  }

  return 0;
}

export function getEditLineTotal(item: LineItemInput) {
  const originalAmount = Number(item.original_amount || 0) || getEditBaseAmount(item);
  return Math.max(originalAmount - getEditItemDiscountAmount(item), 0);
}

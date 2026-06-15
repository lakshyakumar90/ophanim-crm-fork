import { z } from "zod";
import type { CurrencyCode, PaymentMode } from "@/lib/finance-api";
import {
  CURRENCY_OPTIONS,
  emptyLineItem,
  type LineItemInput,
} from "@/lib/invoice-line-item-math";

export { CURRENCY_OPTIONS, emptyLineItem, type LineItemInput };

export const PAYMENT_TERMS_OPTIONS = [
  "Due on Receipt",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
] as const;

export const createInvoiceLineItemSchema = z.object({
  description: z.string(),
  service_name: z.string(),
  plan_name: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  original_amount: z.number(),
  item_discount_type: z.enum(["none", "percentage", "fixed"]),
  item_discount_value: z.number(),
});

export const createInvoiceFormSchema = z.object({
  lead_id: z.string(),
  client_name: z.string(),
  client_email: z.string(),
  client_phone: z.string(),
  client_address: z.string(),
  invoice_date: z.string(),
  due_date: z.string(),
  currency: z.custom<CurrencyCode>(),
  invoice_status: z.enum(["draft", "sent"]),
  tax_rate: z.number(),
  discount_rate: z.number(),
  payment_terms: z.string(),
  notes: z.string(),
  payment_amount: z.string(),
  payment_date: z.string(),
  payment_mode: z.custom<PaymentMode>(),
  payment_transaction_id: z.string(),
  payment_notes: z.string(),
  line_items: z.array(createInvoiceLineItemSchema).min(1),
});

export type CreateInvoiceLineItemValues = z.infer<typeof createInvoiceLineItemSchema>;
export type CreateInvoiceFormValues = z.infer<typeof createInvoiceFormSchema>;

export function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

export const createInvoiceDefaultValues: CreateInvoiceFormValues = {
  lead_id: "",
  client_name: "",
  client_email: "",
  client_phone: "",
  client_address: "",
  invoice_date: getTodayDateString(),
  due_date: "",
  currency: "INR",
  invoice_status: "draft",
  tax_rate: 0,
  discount_rate: 0,
  payment_terms: "Net 30",
  notes: "",
  payment_amount: "",
  payment_date: getTodayDateString(),
  payment_mode: "bank_transfer",
  payment_transaction_id: "",
  payment_notes: "",
  line_items: [emptyLineItem()],
};

export function getCreateBaseAmount(item: LineItemInput) {
  return item.quantity * item.unit_price;
}

export function getCreateItemDiscountAmount(item: LineItemInput) {
  const baseAmount = getCreateBaseAmount(item);
  if (item.item_discount_type === "percentage") {
    return (baseAmount * item.item_discount_value) / 100;
  }
  if (item.item_discount_type === "fixed") {
    return item.item_discount_value;
  }
  return 0;
}

export function getCreateLineTotal(item: LineItemInput) {
  return Math.max(getCreateBaseAmount(item) - getCreateItemDiscountAmount(item), 0);
}

export function getCreateInvoiceTotals(
  lineItems: LineItemInput[],
  discountRate: number,
  taxRate: number,
) {
  const subtotal = lineItems.reduce((sum, item) => sum + getCreateLineTotal(item), 0);
  const discountAmount = subtotal * (discountRate / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const totalAmount = taxableAmount + taxAmount;

  return { subtotal, discountAmount, taxableAmount, taxAmount, totalAmount };
}

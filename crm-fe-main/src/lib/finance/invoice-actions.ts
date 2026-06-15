import {
  invoicesApi,
  paymentsApi,
  type CurrencyCode,
  type InvoiceLineItem,
  type PaymentMode,
} from "@/lib/finance-api";
import { leadsApi } from "@/lib/api";
import type { CreateInvoiceFormValues, LineItemInput } from "@/lib/finance/invoice-form-schema";
import {
  getCreateBaseAmount,
  getCreateLineTotal,
} from "@/lib/finance/invoice-form-schema";

export function getLeadName(lead: any) {
  return lead?.leadName || lead?.lead_name || "Unnamed lead";
}

export function getLeadBusiness(lead: any) {
  return lead?.businessName || lead?.business_name || lead?.company_name || "";
}

export function getLeadEmail(lead: any) {
  return lead?.email || "";
}

export function getLeadPhone(lead: any) {
  return lead?.phone || "";
}

export async function fetchWonLeads() {
  return leadsApi.getWonLeads();
}

export function normalizeWonLeads(wonLeadsData: unknown) {
  if (Array.isArray(wonLeadsData)) return wonLeadsData;
  return (wonLeadsData as { data?: unknown[] })?.data || [];
}

export function buildInvoiceLineItemsPayload(lineItems: LineItemInput[]): InvoiceLineItem[] {
  return lineItems.map((item) => {
    const description =
      item.description.trim() ||
      [item.service_name.trim(), item.plan_name.trim()].filter(Boolean).join(" - ");
    const baseAmount = getCreateBaseAmount(item);
    const lineTotal = getCreateLineTotal(item);

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
  });
}

export function buildCreateInvoicePayload(values: CreateInvoiceFormValues) {
  return {
    lead_id: values.lead_id || undefined,
    client_name: values.client_name.trim(),
    client_email: values.client_email.trim(),
    client_phone: values.client_phone.trim() || undefined,
    client_address: values.client_address.trim() || undefined,
    invoice_date: values.invoice_date,
    due_date: values.due_date,
    currency: values.currency as CurrencyCode,
    status: values.invoice_status,
    tax_rate: values.tax_rate,
    discount_rate: values.discount_rate,
    payment_terms: values.payment_terms,
    notes: values.notes.trim() || undefined,
    line_items: buildInvoiceLineItemsPayload(values.line_items),
  };
}

export async function createInvoice(values: CreateInvoiceFormValues) {
  const response = await invoicesApi.create(buildCreateInvoicePayload(values));
  return response.data.data.id as string;
}

export async function recordInitialPayment(
  invoiceId: string,
  values: Pick<
    CreateInvoiceFormValues,
    | "payment_amount"
    | "payment_date"
    | "payment_mode"
    | "payment_transaction_id"
    | "payment_notes"
  >,
) {
  const amount = Number.parseFloat(values.payment_amount) || 0;
  if (amount <= 0) return;

  await paymentsApi.record(invoiceId, {
    amount,
    payment_date: values.payment_date,
    payment_mode: values.payment_mode as PaymentMode,
    transaction_id: values.payment_transaction_id.trim() || undefined,
    notes: values.payment_notes.trim() || undefined,
  });
}

export async function createInvoiceWithOptionalPayment(values: CreateInvoiceFormValues) {
  const invoiceId = await createInvoice(values);
  await recordInitialPayment(invoiceId, values);
  return invoiceId;
}

export function getCreateInvoiceErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return (
    response?.data?.message || "Failed to create invoice or record the initial payment"
  );
}

import { emailRequestsApi, invoicesApi } from "@/lib/finance-api";
import { leadsApi } from "@/lib/api";
import type { CreateEmailFormValues } from "@/lib/finance/email-form-schema";

export async function fetchInvoicesForEmail() {
  return invoicesApi.list({ limit: 100 });
}

export async function fetchLeadsForEmail() {
  return leadsApi.list({ status: "won", limit: 200 });
}

export function normalizeInvoices(invoicesData: unknown) {
  if (Array.isArray(invoicesData)) return invoicesData;
  const wrapped = invoicesData as { data?: unknown[] };
  return wrapped?.data ?? [];
}

export function normalizeLeads(leadsData: unknown): any[] {
  if (Array.isArray(leadsData)) return leadsData;
  return (leadsData as { data?: any[] })?.data || [];
}

function leadDisplayName(lead: {
  leadName?: string;
  lead_name?: string;
  businessName?: string;
  company_name?: string;
}) {
  return (
    lead.leadName ||
    lead.lead_name ||
    lead.businessName ||
    lead.company_name ||
    "Unnamed lead"
  );
}

export function getInvoiceAutofill(invoice: {
  client_name: string;
  client_email: string;
  invoice_number: string;
  total_amount: number | string;
  due_date: string;
  currency?: string;
}) {
  const currency = invoice.currency || "INR";
  const amount = Number(invoice.total_amount).toLocaleString("en-US", {
    style: "currency",
    currency,
  });
  return {
    recipient_name: invoice.client_name,
    recipient_email: invoice.client_email,
    subject: `Invoice ${invoice.invoice_number}`,
    body: `Dear ${invoice.client_name},\n\nPlease find attached your invoice ${invoice.invoice_number} for ${amount}.\n\nDue date: ${new Date(invoice.due_date).toLocaleDateString()}\n\nThank you for your business!`,
  };
}

export function getLeadAutofill(lead: {
  leadName?: string;
  lead_name?: string;
  businessName?: string;
  company_name?: string;
  email?: string;
}) {
  return {
    recipient_name: leadDisplayName(lead),
    recipient_email: lead.email || "",
  };
}

export function buildEmailRequestPayload(values: CreateEmailFormValues) {
  return {
    email_type: values.email_type,
    invoice_id: values.invoice_id || undefined,
    lead_id:
      values.lead_id && values.lead_id !== "none" ? values.lead_id : undefined,
    recipient_email: values.recipient_email,
    recipient_name: values.recipient_name || undefined,
    subject: values.subject,
    body: values.body,
  };
}

export async function createEmailRequest(values: CreateEmailFormValues) {
  const response = await emailRequestsApi.create(buildEmailRequestPayload(values));
  return response.data.data.id as string;
}

export async function createEmailRequestWithOptionalSubmit(
  values: CreateEmailFormValues,
  submitForApproval: boolean,
) {
  const id = await createEmailRequest(values);
  if (submitForApproval) {
    await emailRequestsApi.submit(id);
  }
  return { id, submitForApproval };
}

export function getCreateEmailErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message || "Failed to create email request";
}

import { emailRequestsApi, invoicesApi } from "@/lib/finance-api";
import { leadsApi } from "@/lib/api";
import type { CreateEmailFormValues } from "@/lib/finance/email-form-schema";

export async function fetchInvoicesForEmail() {
  return invoicesApi.list({ limit: 100 });
}

export async function fetchLeadsForEmail() {
  return leadsApi.list({ limit: 100 });
}

export function normalizeInvoices(invoicesData: unknown) {
  return Array.isArray(invoicesData) ? invoicesData : [];
}

export function normalizeLeads(leadsData: unknown): any[] {
  return (leadsData as { data?: any[] })?.data || [];
}

export function getInvoiceAutofill(invoice: {
  client_name: string;
  client_email: string;
  invoice_number: string;
  total_amount: number | string;
  due_date: string;
}) {
  return {
    recipient_name: invoice.client_name,
    recipient_email: invoice.client_email,
    subject: `Invoice ${invoice.invoice_number}`,
    body: `Dear ${invoice.client_name},\n\nPlease find attached your invoice ${invoice.invoice_number} for ₹${Number(invoice.total_amount).toLocaleString()}.\n\nDue date: ${new Date(invoice.due_date).toLocaleDateString()}\n\nThank you for your business!`,
  };
}

export function getLeadAutofill(lead: {
  lead_name?: string;
  company_name?: string;
  email?: string;
}) {
  return {
    recipient_name: lead.lead_name || lead.company_name || "",
    recipient_email: lead.email || "",
  };
}

export function buildEmailRequestPayload(values: CreateEmailFormValues) {
  return {
    email_type: values.email_type,
    invoice_id: values.invoice_id || undefined,
    lead_id: values.lead_id || undefined,
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

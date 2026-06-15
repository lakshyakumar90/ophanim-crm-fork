import { recurringApi } from "@/lib/finance-api";
import { leadsApi } from "@/lib/api";
import type { CreateRecurringFormValues } from "@/lib/finance/recurring-form-schema";
import { getRecurringBaseAmount } from "@/lib/finance/recurring-form-schema";

export async function fetchLeadsForRecurring() {
  return leadsApi.list({ limit: 100 });
}

export function normalizeLeads(leadsData: unknown): any[] {
  return (leadsData as { data?: any[] })?.data || [];
}

export function getLeadClientAutofill(lead: {
  company_name?: string;
  lead_name?: string;
  email?: string;
}) {
  return {
    client_name: lead.company_name || lead.lead_name || "",
    client_email: lead.email || "",
  };
}

export function buildRecurringSchedulePayload(values: CreateRecurringFormValues) {
  const baseAmount = getRecurringBaseAmount(values.line_items);

  return {
    name: values.name,
    lead_id: values.lead_id || undefined,
    client_name: values.client_name,
    client_email: values.client_email,
    frequency: values.frequency,
    day_of_month: values.frequency !== "weekly" ? values.day_of_month : undefined,
    day_of_week: values.frequency === "weekly" ? values.day_of_week : undefined,
    start_date: values.start_date,
    end_date: values.end_date || undefined,
    base_amount: baseAmount,
    tax_rate: values.tax_rate,
    line_items_template: values.line_items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    })),
    auto_send_email: values.auto_send_email,
    requires_approval: values.requires_approval,
  };
}

export async function createRecurringSchedule(values: CreateRecurringFormValues) {
  await recurringApi.create(buildRecurringSchedulePayload(values));
}

export function getCreateRecurringErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message || "Failed to create schedule";
}

import { z } from "zod";

export function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

export const recurringLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
});

export type RecurringLineItemInput = z.infer<typeof recurringLineItemSchema>;

export const RECURRING_FREQUENCIES = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export const createRecurringFormSchema = z.object({
  name: z.string(),
  lead_id: z.string(),
  client_name: z.string(),
  client_email: z.string(),
  frequency: z.enum(RECURRING_FREQUENCIES),
  day_of_month: z.number(),
  day_of_week: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  tax_rate: z.number(),
  auto_send_email: z.boolean(),
  requires_approval: z.boolean(),
  line_items: z.array(recurringLineItemSchema).min(1),
});

export type CreateRecurringFormValues = z.infer<typeof createRecurringFormSchema>;

export const emptyRecurringLineItem = (): RecurringLineItemInput => ({
  description: "",
  quantity: 1,
  unit_price: 0,
});

export const createRecurringDefaultValues: CreateRecurringFormValues = {
  name: "",
  lead_id: "",
  client_name: "",
  client_email: "",
  frequency: "monthly",
  day_of_month: 1,
  day_of_week: 1,
  start_date: getTodayDateString(),
  end_date: "",
  tax_rate: 18,
  auto_send_email: false,
  requires_approval: true,
  line_items: [emptyRecurringLineItem()],
};

export const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export function getRecurringBaseAmount(lineItems: RecurringLineItemInput[]) {
  return lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
}

export function validateRecurringForm(values: CreateRecurringFormValues) {
  if (!values.name || !values.client_name || !values.client_email || !values.start_date) {
    return "Please fill in required fields";
  }

  if (
    values.line_items.some((item) => !item.description || item.unit_price <= 0)
  ) {
    return "Please fill in all line items";
  }

  return null;
}

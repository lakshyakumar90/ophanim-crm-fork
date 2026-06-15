import { z } from "zod";

export function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

export const createExpenseFormSchema = z.object({
  category_id: z.string(),
  amount: z.string(),
  expense_date: z.string(),
  vendor_name: z.string(),
  description: z.string(),
  receipt_url: z.string(),
  notes: z.string(),
});

export type CreateExpenseFormValues = z.infer<typeof createExpenseFormSchema>;

export const createExpenseDefaultValues: CreateExpenseFormValues = {
  category_id: "",
  amount: "",
  expense_date: getTodayDateString(),
  vendor_name: "",
  description: "",
  receipt_url: "",
  notes: "",
};

export function validateExpenseForm(values: CreateExpenseFormValues) {
  if (!values.category_id || !values.amount || !values.description) {
    return "Please fill in required fields";
  }
  return null;
}

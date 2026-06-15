import { expensesApi, expenseCategoriesApi } from "@/lib/finance-api";
import type { CreateExpenseFormValues } from "@/lib/finance/expense-form-schema";

export async function fetchExpenseCategories() {
  return expenseCategoriesApi.list();
}

export function buildExpenseSubmitPayload(values: CreateExpenseFormValues) {
  return {
    category_id: values.category_id,
    amount: parseFloat(values.amount),
    expense_date: values.expense_date,
    vendor_name: values.vendor_name || undefined,
    description: values.description,
    receipt_url: values.receipt_url || undefined,
    notes: values.notes || undefined,
  };
}

export async function submitExpense(values: CreateExpenseFormValues) {
  await expensesApi.submit(buildExpenseSubmitPayload(values));
}

export function getSubmitExpenseErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message || "Failed to submit expense";
}

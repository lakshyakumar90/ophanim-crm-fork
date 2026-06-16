/** Shared finance permission key groups for route guards */

export const FINANCE_VIEW_ANY = [
  "finance:view",
  "finance:manage",
  "invoices:view",
  "invoices:manage",
  "invoices:approve",
  "payments:view",
  "payments:manage",
  "expenses:view",
  "expenses:manage",
  "expenses:approve",
  "budgets:view",
  "budgets:manage",
] as const;

export const INVOICE_VIEW_ANY = [
  "finance:view",
  "finance:manage",
  "invoices:view",
  "invoices:manage",
  "invoices:approve",
] as const;

export const INVOICE_MANAGE_ANY = [
  "finance:manage",
  "invoices:manage",
] as const;

export const INVOICE_APPROVE_ANY = [
  "finance:manage",
  "invoices:approve",
] as const;

export const PAYMENT_VIEW_ANY = [
  "finance:view",
  "finance:manage",
  "payments:view",
  "payments:manage",
] as const;

export const PAYMENT_MANAGE_ANY = [
  "finance:manage",
  "payments:manage",
] as const;

export const EXPENSE_VIEW_ANY = [
  "finance:view",
  "finance:manage",
  "expenses:view",
  "expenses:manage",
  "expenses:approve",
] as const;

export const EXPENSE_MANAGE_ANY = [
  "finance:manage",
  "expenses:manage",
] as const;

export const EXPENSE_APPROVE_ANY = [
  "finance:manage",
  "expenses:approve",
] as const;

export const BUDGET_VIEW_ANY = [
  "finance:view",
  "finance:manage",
  "budgets:view",
  "budgets:manage",
] as const;

export const BUDGET_MANAGE_ANY = [
  "finance:manage",
  "budgets:manage",
] as const;

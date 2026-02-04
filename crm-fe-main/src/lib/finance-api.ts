import api from "./api";

// ============================================
// TYPES
// ============================================

export interface Invoice {
  id: string;
  invoice_number: string;
  lead_id?: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_address?: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  status:
    | "draft"
    | "pending_approval"
    | "sent"
    | "paid"
    | "overdue"
    | "cancelled";
  payment_terms?: string;
  notes?: string;
  attachments?: unknown[];
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  is_recurring?: boolean;
  recurring_schedule_id?: string;
  department_id?: string;
  created_at: string;
  updated_at: string;
  lead?: { id: string; lead_name: string; company_name?: string };
  creator?: { id: string; full_name: string; email: string };
  approver?: { id: string; full_name: string };
  line_items?: InvoiceLineItem[];
  payments?: Payment[];
}

export interface InvoiceLineItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  total: number;
  sort_order?: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_mode: "cash" | "bank_transfer" | "upi" | "card" | "cheque" | "other";
  transaction_id?: string;
  status: "success" | "pending" | "failed";
  notes?: string;
  recorded_by?: string;
  created_at: string;
  invoice?: { id: string; invoice_number: string; client_name: string };
  recorder?: { id: string; full_name: string };
}

export interface Expense {
  id: string;
  expense_number: string;
  category_id: string;
  amount: number;
  expense_date: string;
  paid_by?: string;
  department_id?: string;
  vendor_name?: string;
  description: string;
  receipt_url?: string;
  status: "pending" | "approved" | "rejected";
  submitted_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string };
  submitter?: { id: string; full_name: string; email: string };
  approver?: { id: string; full_name: string };
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  monthly_budget?: number;
  is_active: boolean;
  created_at: string;
}

export interface FinanceApproval {
  id: string;
  approval_type: "invoice" | "expense" | "email";
  entity_id: string;
  requested_by?: string;
  requested_at: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  comments?: string;
  created_at: string;
  requester?: { id: string; full_name: string; email: string };
  entity?: unknown;
}

export interface EmailRequest {
  id: string;
  email_type: "invoice" | "payment_reminder" | "receipt" | "custom";
  invoice_id?: string;
  lead_id?: string;
  sender_id: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body: string;
  attachments?: unknown[];
  status:
    | "draft"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "sent"
    | "failed";
  scheduled_at?: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  rejection_reason?: string;
  error_message?: string;
  created_at: string;
  sender?: { id: string; full_name: string; email: string };
  approver?: { id: string; full_name: string };
}

export interface RecurringSchedule {
  id: string;
  name: string;
  lead_id?: string;
  client_name: string;
  client_email: string;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  day_of_month?: number;
  day_of_week?: number;
  start_date: string;
  end_date?: string;
  next_run_date: string;
  base_amount: number;
  tax_rate?: number;
  line_items_template?: InvoiceLineItem[];
  auto_send_email?: boolean;
  requires_approval?: boolean;
  is_active: boolean;
  department_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  lead?: { id: string; lead_name: string; company_name?: string };
  creator?: { id: string; full_name: string };
}

export interface FinanceDashboard {
  summary: {
    total_revenue: number;
    outstanding_amount: number;
    this_month_expenses: number;
    net_balance: number;
    pending_approvals: number;
    overdue_invoices: number;
    overdue_amount: number;
  };
  expense_breakdown: Record<string, number>;
  payment_by_mode: Record<string, number>;
}

// ============================================
// INVOICE API
// ============================================

export const invoicesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/finance/invoices", { params }),

  get: (id: string) => api.get(`/finance/invoices/${id}`),

  create: (data: {
    lead_id?: string;
    client_name: string;
    client_email: string;
    client_phone?: string;
    client_address?: string;
    invoice_date?: string;
    due_date: string;
    tax_rate?: number;
    discount_rate?: number;
    payment_terms?: string;
    notes?: string;
    department_id?: string;
    line_items: InvoiceLineItem[];
  }) => api.post("/finance/invoices", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/finance/invoices/${id}`, data),

  submit: (id: string) => api.post(`/finance/invoices/${id}/submit`),

  approve: (id: string) => api.post(`/finance/invoices/${id}/approve`),

  reject: (id: string, reason: string) =>
    api.post(`/finance/invoices/${id}/reject`, { reason }),

  cancel: (id: string) => api.post(`/finance/invoices/${id}/cancel`),

  markSent: (id: string) => api.post(`/finance/invoices/${id}/mark-sent`),
};

// ============================================
// PAYMENT API
// ============================================

export const paymentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/finance/payments", { params }),

  getForInvoice: (invoiceId: string) =>
    api.get(`/finance/invoices/${invoiceId}/payments`),

  record: (
    invoiceId: string,
    data: {
      amount: number;
      payment_date?: string;
      payment_mode:
        | "cash"
        | "bank_transfer"
        | "upi"
        | "card"
        | "cheque"
        | "other";
      transaction_id?: string;
      status?: "success" | "pending" | "failed";
      notes?: string;
    },
  ) => api.post(`/finance/invoices/${invoiceId}/payments`, data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/finance/payments/${id}`, data),
};

// ============================================
// EXPENSE API
// ============================================

export const expensesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/finance/expenses", { params }),

  get: (id: string) => api.get(`/finance/expenses/${id}`),

  submit: (data: {
    category_id: string;
    amount: number;
    expense_date?: string;
    vendor_name?: string;
    description: string;
    receipt_url?: string;
    notes?: string;
    department_id?: string;
  }) => api.post("/finance/expenses", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/finance/expenses/${id}`, data),

  approve: (id: string) => api.post(`/finance/expenses/${id}/approve`),

  reject: (id: string, reason: string) =>
    api.post(`/finance/expenses/${id}/reject`, { reason }),
};

// ============================================
// EXPENSE CATEGORY API
// ============================================

export const expenseCategoriesApi = {
  list: (activeOnly: boolean = true) =>
    api.get("/finance/expense-categories", {
      params: { active_only: activeOnly },
    }),

  create: (data: {
    name: string;
    description?: string;
    monthly_budget?: number;
  }) => api.post("/finance/expense-categories", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/finance/expense-categories/${id}`, data),
};

// ============================================
// APPROVALS API
// ============================================

export const approvalsApi = {
  list: (params?: { type?: string; limit?: number; offset?: number }) =>
    api.get("/finance/approvals", { params }),

  getCount: (type?: string) =>
    api.get("/finance/approvals/count", { params: { type } }),

  bulkApprove: (approvalIds: string[]) =>
    api.post("/finance/approvals/bulk-approve", { approval_ids: approvalIds }),
};

// ============================================
// EMAIL REQUEST API
// ============================================

export const emailRequestsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/finance/email-requests", { params }),

  get: (id: string) => api.get(`/finance/email-requests/${id}`),

  create: (data: {
    email_type: "invoice" | "payment_reminder" | "receipt" | "custom";
    invoice_id?: string;
    lead_id?: string;
    recipient_email: string;
    recipient_name?: string;
    subject: string;
    body: string;
    attachments?: unknown[];
  }) => api.post("/finance/email-requests", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/finance/email-requests/${id}`, data),

  submit: (id: string) => api.post(`/finance/email-requests/${id}/submit`),

  approve: (id: string) => api.post(`/finance/email-requests/${id}/approve`),

  reject: (id: string, reason: string) =>
    api.post(`/finance/email-requests/${id}/reject`, { reason }),

  send: (id: string) => api.post(`/finance/email-requests/${id}/send`),

  schedule: (id: string, scheduledFor: string) =>
    api.post(`/finance/email-requests/${id}/schedule`, {
      scheduled_for: scheduledFor,
    }),
};

// ============================================
// RECURRING SCHEDULE API
// ============================================

export const recurringApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/finance/recurring", { params }),

  get: (id: string) => api.get(`/finance/recurring/${id}`),

  create: (data: {
    name: string;
    lead_id?: string;
    client_name: string;
    client_email: string;
    frequency: "weekly" | "monthly" | "quarterly" | "yearly";
    day_of_month?: number;
    day_of_week?: number;
    start_date: string;
    end_date?: string;
    base_amount: number;
    tax_rate?: number;
    line_items_template: InvoiceLineItem[];
    auto_send_email?: boolean;
    requires_approval?: boolean;
    department_id?: string;
  }) => api.post("/finance/recurring", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/finance/recurring/${id}`, data),

  pause: (id: string) => api.post(`/finance/recurring/${id}/pause`),

  resume: (id: string) => api.post(`/finance/recurring/${id}/resume`),

  delete: (id: string) => api.delete(`/finance/recurring/${id}`),
};

// ============================================
// FINANCE DASHBOARD API
// ============================================

export const financeDashboardApi = {
  get: (departmentId?: string) =>
    api.get("/finance/dashboard", { params: { department_id: departmentId } }),

  getRevenueTrend: (departmentId?: string) =>
    api.get("/finance/dashboard/revenue-trend", {
      params: { department_id: departmentId },
    }),

  getInvoiceStatus: (departmentId?: string) =>
    api.get("/finance/dashboard/invoice-status", {
      params: { department_id: departmentId },
    }),

  getOutstandingClients: (departmentId?: string, limit?: number) =>
    api.get("/finance/dashboard/outstanding-clients", {
      params: { department_id: departmentId, limit },
    }),

  getActivity: (departmentId?: string, limit?: number) =>
    api.get("/finance/dashboard/activity", {
      params: { department_id: departmentId, limit },
    }),
};

// ============================================
// FINANCE ANALYTICS API
// ============================================

export const financeAnalyticsApi = {
  get: (departmentId?: string) =>
    api.get("/finance/analytics", {
      params: { department_id: departmentId },
    }),
};

// ============================================
// SCHEDULED EMAILS API
// ============================================

export const scheduledEmailsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get("/finance/scheduled-emails", { params }),

  cancel: (id: string) => api.post(`/finance/scheduled-emails/${id}/cancel`),

  reschedule: (id: string, scheduledFor: string) =>
    api.post(`/finance/scheduled-emails/${id}/reschedule`, {
      scheduled_for: scheduledFor,
    }),
};

// ============================================
// CRON TRIGGERS (Admin)
// ============================================

export const financeCronApi = {
  processScheduledEmails: () =>
    api.post("/finance/cron/process-scheduled-emails"),

  processRecurringInvoices: () =>
    api.post("/finance/cron/process-recurring-invoices"),

  updateOverdue: () => api.post("/finance/cron/update-overdue"),
};

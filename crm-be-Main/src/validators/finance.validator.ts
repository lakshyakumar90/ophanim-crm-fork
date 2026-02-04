import { z } from "zod";

// ============================================
// INVOICE VALIDATORS
// ============================================

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be positive"),
  unit_price: z.number().min(0, "Unit price must be non-negative"),
  tax_rate: z.number().min(0).max(100).optional(),
});

export const createInvoiceSchema = z.object({
  lead_id: z.string().uuid().optional(),
  client_name: z.string().min(1, "Client name is required"),
  client_email: z.string().email("Valid email required"),
  client_phone: z.string().optional(),
  client_address: z.string().optional(),
  invoice_date: z.string().optional(),
  due_date: z.string().min(1, "Due date is required"),
  tax_rate: z.number().min(0).max(100).optional(),
  discount_rate: z.number().min(0).max(100).optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
  department_id: z.string().uuid().optional(),
  line_items: z.array(lineItemSchema).min(1, "At least one line item required"),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

// ============================================
// PAYMENT VALIDATORS
// ============================================

export const createPaymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be positive"),
  payment_date: z.string().optional(),
  payment_mode: z.enum([
    "cash",
    "bank_transfer",
    "upi",
    "card",
    "cheque",
    "other",
  ]),
  transaction_id: z.string().optional(),
  status: z.enum(["success", "pending", "failed"]).optional(),
  notes: z.string().optional(),
});

export const updatePaymentSchema = createPaymentSchema.partial();

// ============================================
// EXPENSE VALIDATORS
// ============================================

export const createExpenseSchema = z.object({
  category_id: z.string().uuid("Valid category required"),
  amount: z.number().min(0.01, "Amount must be positive"),
  expense_date: z.string().optional(),
  vendor_name: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  receipt_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
  department_id: z.string().uuid().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// ============================================
// EMAIL REQUEST VALIDATORS
// ============================================

export const createEmailRequestSchema = z.object({
  email_type: z.enum(["invoice", "payment_reminder", "receipt", "custom"]),
  invoice_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  recipient_email: z.string().email("Valid recipient email required"),
  recipient_name: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  attachments: z.array(z.unknown()).optional(),
});

export const updateEmailRequestSchema = createEmailRequestSchema.partial();

export const scheduleEmailSchema = z.object({
  scheduled_for: z.string().min(1, "Scheduled time is required"),
});

// ============================================
// RECURRING SCHEDULE VALIDATORS
// ============================================

const lineItemTemplateSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unit_price: z.number().min(0),
});

export const createRecurringScheduleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  lead_id: z.string().uuid().optional(),
  client_name: z.string().min(1, "Client name is required"),
  client_email: z.string().email("Valid email required"),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  day_of_month: z.number().min(1).max(28).optional(),
  day_of_week: z.number().min(0).max(6).optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  base_amount: z.number().min(0, "Amount must be non-negative"),
  tax_rate: z.number().min(0).max(100).optional(),
  line_items_template: z
    .array(lineItemTemplateSchema)
    .min(1, "At least one line item required"),
  auto_send_email: z.boolean().optional(),
  requires_approval: z.boolean().optional(),
  department_id: z.string().uuid().optional(),
});

export const updateRecurringScheduleSchema = createRecurringScheduleSchema
  .partial()
  .extend({
    is_active: z.boolean().optional(),
  });

// ============================================
// EXPENSE CATEGORY VALIDATORS
// ============================================

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  monthly_budget: z.number().min(0).optional(),
});

export const updateExpenseCategorySchema = createExpenseCategorySchema
  .partial()
  .extend({
    is_active: z.boolean().optional(),
  });

// ============================================
// APPROVAL VALIDATORS
// ============================================

export const rejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

export const bulkApproveSchema = z.object({
  approval_ids: z
    .array(z.string().uuid())
    .min(1, "At least one approval ID required"),
});

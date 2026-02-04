import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../utils/logger.js";
import { getISTDate, getISTTimestamp } from "../../utils/date-utils.js";

// Types
export interface CreatePaymentInput {
  invoice_id: string;
  amount: number;
  payment_date?: string;
  payment_mode: "cash" | "bank_transfer" | "upi" | "card" | "cheque" | "other";
  transaction_id?: string;
  status?: "success" | "pending" | "failed";
  notes?: string;
}

export interface PaymentFilters {
  invoice_id?: string;
  status?: string;
  payment_mode?: string;
  from_date?: string;
  to_date?: string;
}

/**
 * Get all payments with optional filters
 */
export async function getPayments(
  filters: PaymentFilters = {},
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
  let query = supabaseAdmin.from("payments").select(
    `
      *,
      invoice:invoices(id, invoice_number, client_name, total_amount),
      recorder:users!payments_recorded_by_fkey(id, full_name)
    `,
    { count: "exact" },
  );

  if (filters.invoice_id) {
    query = query.eq("invoice_id", filters.invoice_id);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.payment_mode) {
    query = query.eq("payment_mode", filters.payment_mode);
  }
  if (filters.from_date) {
    query = query.gte("payment_date", filters.from_date);
  }
  if (filters.to_date) {
    query = query.lte("payment_date", filters.to_date);
  }

  query = query
    .order("payment_date", { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error({ error }, "Error fetching payments");
    throw error;
  }

  return { data: data || [], total: count || 0 };
}

/**
 * Get payments for a specific invoice
 */
export async function getPaymentsForInvoice(invoiceId: string) {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(
      `
      *,
      recorder:users!payments_recorded_by_fkey(id, full_name)
    `,
    )
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Record a new payment
 */
export async function recordPayment(
  input: CreatePaymentInput,
  recordedBy: string,
) {
  // Validate invoice exists and is not draft/cancelled
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .select("id, status, total_amount, amount_paid")
    .eq("id", input.invoice_id)
    .single();

  if (invoiceError || !invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "draft" || invoice.status === "pending_approval") {
    throw new Error(
      "Cannot record payment for draft or pending approval invoice",
    );
  }

  if (invoice.status === "cancelled") {
    throw new Error("Cannot record payment for cancelled invoice");
  }

  // Validate payment amount
  const outstanding =
    Number(invoice.total_amount) - Number(invoice.amount_paid);
  if (input.amount > outstanding && input.status === "success") {
    throw new Error(
      `Payment amount exceeds outstanding balance of ${outstanding}`,
    );
  }

  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .insert({
      invoice_id: input.invoice_id,
      amount: input.amount,
      payment_date: input.payment_date || getISTDate(),
      payment_mode: input.payment_mode,
      transaction_id: input.transaction_id,
      status: input.status || "success",
      notes: input.notes,
      recorded_by: recordedBy,
    })
    .select(
      `
      *,
      invoice:invoices(id, invoice_number, client_name),
      recorder:users!payments_recorded_by_fkey(id, full_name)
    `,
    )
    .single();

  if (error) {
    logger.error({ error }, "Error recording payment");
    throw error;
  }

  logger.info(
    {
      paymentId: payment.id,
      invoiceId: input.invoice_id,
      amount: input.amount,
    },
    "Payment recorded",
  );
  return payment;
}

/**
 * Update payment
 */
export async function updatePayment(
  paymentId: string,
  input: Partial<CreatePaymentInput>,
  userId: string,
) {
  const updateData: Record<string, unknown> = {};

  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.payment_date) updateData.payment_date = input.payment_date;
  if (input.payment_mode) updateData.payment_mode = input.payment_mode;
  if (input.transaction_id !== undefined)
    updateData.transaction_id = input.transaction_id;
  if (input.status) updateData.status = input.status;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabaseAdmin
    .from("payments")
    .update(updateData)
    .eq("id", paymentId)
    .select(
      `
      *,
      invoice:invoices(id, invoice_number, client_name),
      recorder:users!payments_recorded_by_fkey(id, full_name)
    `,
    )
    .single();

  if (error) {
    throw error;
  }

  logger.info({ paymentId }, "Payment updated");
  return data;
}

/**
 * Delete payment
 */
export async function deletePayment(paymentId: string) {
  const { error } = await supabaseAdmin
    .from("payments")
    .delete()
    .eq("id", paymentId);

  if (error) {
    throw error;
  }

  logger.info({ paymentId }, "Payment deleted");
}

/**
 * Get payment stats for dashboard
 */
export async function getPaymentStats(
  departmentId?: string,
  fromDate?: string,
  toDate?: string,
) {
  let query = supabaseAdmin
    .from("payments")
    .select(
      `
      amount,
      payment_mode,
      status,
      payment_date,
      invoice:invoices!inner(department_id)
    `,
    )
    .eq("status", "success");

  if (departmentId) {
    query = query.eq("invoice.department_id", departmentId);
  }
  if (fromDate) {
    query = query.gte("payment_date", fromDate);
  }
  if (toDate) {
    query = query.lte("payment_date", toDate);
  }

  const { data } = await query;

  if (!data) {
    return {
      total_received: 0,
      by_mode: {},
    };
  }

  const stats = data.reduce(
    (acc, payment) => {
      const amount = Number(payment.amount) || 0;
      acc.total_received += amount;
      acc.by_mode[payment.payment_mode] =
        (acc.by_mode[payment.payment_mode] || 0) + amount;
      return acc;
    },
    { total_received: 0, by_mode: {} as Record<string, number> },
  );

  return stats;
}

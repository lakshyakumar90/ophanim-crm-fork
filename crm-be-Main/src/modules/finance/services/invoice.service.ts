import { supabaseAdmin } from "../../../config/supabase.js";
import { logger } from "../../../utils/logger.js";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { USER_ROLES } from "../../../config/constants.js";
import { getISTDate, getISTTimestamp } from "../../../utils/date-utils.js";

// Types
export interface InvoiceLineItem {
  id?: string;
  description: string;
  service_name?: string;
  plan_name?: string;
  original_amount?: number;
  quantity: number;
  unit_price: number;
  item_discount_type?: "none" | "percentage" | "fixed";
  item_discount_value?: number;
  tax_rate?: number;
  total: number;
  sort_order?: number;
}

export interface CreateInvoiceInput {
  lead_id?: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_address?: string;
  invoice_date?: string;
  due_date: string;
  currency?: "USD" | "CAD" | "GBP" | "EUR" | "INR";
  status?:
    | "draft"
    | "pending_approval"
    | "sent"
    | "paid"
    | "overdue"
    | "cancelled";
  tax_rate?: number;
  discount_rate?: number;
  payment_terms?: string;
  notes?: string;
  department_id?: string;
  line_items: InvoiceLineItem[];
}

export interface UpdateInvoiceInput extends Partial<CreateInvoiceInput> {
  status?:
    | "draft"
    | "pending_approval"
    | "sent"
    | "paid"
    | "overdue"
    | "cancelled";
}

export interface InvoiceFilters {
  status?: string;
  lead_id?: string;
  created_by?: string;
  department_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}

function calculateLineItemTotal(item: InvoiceLineItem): number {
  const baseAmount = Number(item.quantity || 0) * Number(item.unit_price || 0);
  const discountType = item.item_discount_type || "none";
  const discountValue = Number(item.item_discount_value || 0);
  const discountAmount =
    discountType === "percentage"
      ? (baseAmount * discountValue) / 100
      : discountType === "fixed"
        ? discountValue
        : 0;

  return Math.max(baseAmount - discountAmount, 0);
}

function calculateInvoiceAmounts(
  lineItems: InvoiceLineItem[],
  taxRate: number,
  discountRate: number,
) {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + calculateLineItemTotal(item),
    0,
  );
  const discountAmount = subtotal * ((discountRate || 0) / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * ((taxRate || 0) / 100);
  const totalAmount = taxableAmount + taxAmount;

  return {
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
  };
}

async function syncInvoiceAmounts(
  invoiceId: string,
  lineItems: InvoiceLineItem[],
  taxRate: number,
  discountRate: number,
) {
  const amounts = calculateInvoiceAmounts(lineItems, taxRate, discountRate);

  await supabaseAdmin
    .from("invoices")
    .update({
      subtotal: amounts.subtotal,
      discount_amount: amounts.discountAmount,
      tax_amount: amounts.taxAmount,
      total_amount: amounts.totalAmount,
      updated_at: getISTTimestamp(),
    })
    .eq("id", invoiceId);

  return amounts;
}

/**
 * Get invoices with role-based filtering
 */
export async function getInvoices(
  userId: string,
  role: string,
  departmentId: string | null,
  filters: InvoiceFilters = {},
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
  let query = supabaseAdmin.from("invoices").select(
    `
      *,
      lead:leads(id, lead_name, business_name),
      creator:users!invoices_created_by_fkey(id, full_name, email),
      approver:users!invoices_approved_by_fkey(id, full_name)
    `,
    { count: "exact" },
  );

  // Role-based filtering with department security
  if (role === USER_ROLES.EMPLOYEE) {
    // Employee sees only their own invoices
    query = query.eq("created_by", userId);
  } else if (role === USER_ROLES.MANAGER && departmentId) {
    // Managers see only invoices in their department
    query = query.eq("department_id", departmentId);
  }
  // Admins see all invoices (no filter)

  // Apply filters
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.lead_id) {
    query = query.eq("lead_id", filters.lead_id);
  }
  if (filters.created_by) {
    query = query.eq("created_by", filters.created_by);
  }
  if (filters.department_id) {
    query = query.eq("department_id", filters.department_id);
  }
  if (filters.from_date) {
    query = query.gte("invoice_date", filters.from_date);
  }
  if (filters.to_date) {
    query = query.lte("invoice_date", filters.to_date);
  }
  if (filters.search) {
    query = query.or(
      `client_name.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%`,
    );
  }

  query = query
    .order("created_at", { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error({ error }, "Error fetching invoices");
    throw error;
  }

  return { data: data || [], total: count || 0 };
}

/**
 * Get single invoice with line items
 */
export async function getInvoiceById(invoiceId: string) {
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select(
      `
      *,
      lead:leads(id, lead_name, business_name, email),
      creator:users!invoices_created_by_fkey(id, full_name, email),
      approver:users!invoices_approved_by_fkey(id, full_name),
      department:departments(id, name)
    `,
    )
    .eq("id", invoiceId)
    .single();

  if (error) {
    throw error;
  }

  // Get line items
  const { data: lineItems } = await supabaseAdmin
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order");

  // Get payments
  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select(
      `
      *,
      recorder:users!payments_recorded_by_fkey(id, full_name)
    `,
    )
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false });

  const normalizedLineItems = (lineItems || []).map((item) => ({
    ...item,
    total: calculateLineItemTotal(item as InvoiceLineItem),
  }));

  const amounts = calculateInvoiceAmounts(
    normalizedLineItems as InvoiceLineItem[],
    Number(invoice.tax_rate || 0),
    Number(invoice.discount_rate || 0),
  );

  const hasMismatch =
    Number(invoice.subtotal || 0) !== amounts.subtotal ||
    Number(invoice.discount_amount || 0) !== amounts.discountAmount ||
    Number(invoice.tax_amount || 0) !== amounts.taxAmount ||
    Number(invoice.total_amount || 0) !== amounts.totalAmount;

  if (hasMismatch) {
    await syncInvoiceAmounts(
      invoiceId,
      normalizedLineItems as InvoiceLineItem[],
      Number(invoice.tax_rate || 0),
      Number(invoice.discount_rate || 0),
    );
  }

  return {
    ...invoice,
    subtotal: amounts.subtotal,
    discount_amount: amounts.discountAmount,
    tax_amount: amounts.taxAmount,
    total_amount: amounts.totalAmount,
    line_items: normalizedLineItems || [],
    payments: payments || [],
  };
}

/**
 * Create invoice with line items
 */
export async function createInvoice(
  input: CreateInvoiceInput,
  createdBy: string,
) {
  const targetStatus = input.status === "draft" ? "draft" : "sent";

  // Calculate line item totals
  const lineItemsWithTotals = input.line_items.map((item, index) => {
    const baseAmount = item.quantity * item.unit_price;
    const discountType = item.item_discount_type || "none";
    const discountValue = item.item_discount_value || 0;
    const discountAmount =
      discountType === "percentage"
        ? (baseAmount * discountValue) / 100
        : discountType === "fixed"
          ? discountValue
          : 0;
    const lineTotal = Math.max(baseAmount - discountAmount, 0);

    return {
      ...item,
      description:
        item.description ||
        [item.service_name, item.plan_name].filter(Boolean).join(" - "),
      original_amount: item.original_amount ?? baseAmount,
      item_discount_type: discountType,
      item_discount_value: discountValue,
      total: lineTotal,
      sort_order: index,
    };
  });

  const { subtotal, discountAmount, taxAmount, totalAmount } =
    calculateInvoiceAmounts(
      lineItemsWithTotals as InvoiceLineItem[],
      Number(input.tax_rate || 0),
      Number(input.discount_rate || 0),
    );

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .insert({
      lead_id: input.lead_id,
      client_name: input.client_name,
      client_email: input.client_email,
      client_phone: input.client_phone,
      client_address: input.client_address,
      invoice_date: input.invoice_date || getISTDate(),
      due_date: input.due_date,
      currency: input.currency || "INR",
      subtotal,
      tax_rate: input.tax_rate || 0,
      tax_amount: taxAmount,
      discount_rate: input.discount_rate || 0,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      payment_terms: input.payment_terms || "Net 30",
      notes: input.notes,
      department_id: input.department_id,
      created_by: createdBy,
      status: targetStatus,
      sent_at: targetStatus === "sent" ? getISTTimestamp() : null,
    })
    .select()
    .single();

  if (invoiceError) {
    logger.error({ error: invoiceError }, "Error creating invoice");
    throw invoiceError;
  }

  // Create line items
  if (lineItemsWithTotals.length > 0) {
    const { error: lineItemsError } = await supabaseAdmin
      .from("invoice_line_items")
      .insert(
        lineItemsWithTotals.map((item) => ({
          invoice_id: invoice.id,
          description: item.description,
          service_name: item.service_name,
          plan_name: item.plan_name,
          original_amount: item.original_amount,
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_discount_type: item.item_discount_type || "none",
          item_discount_value: item.item_discount_value || 0,
          tax_rate: item.tax_rate || 0,
          total: item.total,
          sort_order: item.sort_order,
        })),
      );

    if (lineItemsError) {
      logger.error({ error: lineItemsError }, "Error creating line items");
      // Cleanup invoice
      await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
      throw lineItemsError;
    }
  }

  await syncInvoiceAmounts(
    invoice.id,
    lineItemsWithTotals as InvoiceLineItem[],
    Number(input.tax_rate || 0),
    Number(input.discount_rate || 0),
  );

  logger.info({ invoiceId: invoice.id }, "Invoice created");
  return getInvoiceById(invoice.id);
}

/**
 * Update invoice (only draft status allowed)
 */
export async function updateInvoice(
  invoiceId: string,
  input: UpdateInvoiceInput,
  userId: string,
) {
  // Check invoice status
  const { data: existing } = await supabaseAdmin
    .from("invoices")
    .select("status, created_by")
    .eq("id", invoiceId)
    .single();

  if (!existing) {
    throw new Error("Invoice not found");
  }

  if (existing.status !== "draft") {
    throw new Error("Only draft invoices can be edited");
  }

  // Update invoice
  const updateData: Record<string, unknown> = {
    updated_at: getISTTimestamp(),
  };

  if (input.client_name) updateData.client_name = input.client_name;
  if (input.client_email) updateData.client_email = input.client_email;
  if (input.client_phone !== undefined)
    updateData.client_phone = input.client_phone;
  if (input.client_address !== undefined)
    updateData.client_address = input.client_address;
  if (input.invoice_date) updateData.invoice_date = input.invoice_date;
  if (input.due_date) updateData.due_date = input.due_date;
  if (input.currency) updateData.currency = input.currency;
  if (input.tax_rate !== undefined) updateData.tax_rate = input.tax_rate;
  if (input.discount_rate !== undefined)
    updateData.discount_rate = input.discount_rate;
  if (input.payment_terms !== undefined)
    updateData.payment_terms = input.payment_terms;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .update(updateData)
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Update line items if provided
  if (input.line_items) {
    // Delete existing line items
    await supabaseAdmin
      .from("invoice_line_items")
      .delete()
      .eq("invoice_id", invoiceId);

    // Insert new line items
    if (input.line_items.length > 0) {
      const lineItemsWithTotals = input.line_items.map((item, index) => {
        const baseAmount = item.quantity * item.unit_price;
        const discountType = item.item_discount_type || "none";
        const discountValue = item.item_discount_value || 0;
        const discountAmount =
          discountType === "percentage"
            ? (baseAmount * discountValue) / 100
            : discountType === "fixed"
              ? discountValue
              : 0;

        return {
          invoice_id: invoiceId,
          description:
            item.description ||
            [item.service_name, item.plan_name].filter(Boolean).join(" - "),
          service_name: item.service_name,
          plan_name: item.plan_name,
          original_amount: item.original_amount ?? baseAmount,
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_discount_type: discountType,
          item_discount_value: discountValue,
          tax_rate: item.tax_rate || 0,
          total: Math.max(baseAmount - discountAmount, 0),
          sort_order: index,
        };
      });

      await supabaseAdmin
        .from("invoice_line_items")
        .insert(lineItemsWithTotals);
    }

    // Recalculate totals (trigger will handle this, but let's also update manually)
    await syncInvoiceAmounts(
      invoiceId,
      input.line_items,
      Number(input.tax_rate ?? invoice.tax_rate ?? 0),
      Number(input.discount_rate ?? invoice.discount_rate ?? 0),
    );
  }

  return getInvoiceById(invoiceId);
}

export async function deleteInvoice(invoiceId: string) {
  await supabaseAdmin
    .from("finance_approvals")
    .delete()
    .eq("entity_id", invoiceId)
    .eq("approval_type", "invoice");

  await supabaseAdmin.from("payments").delete().eq("invoice_id", invoiceId);
  await supabaseAdmin
    .from("invoice_line_items")
    .delete()
    .eq("invoice_id", invoiceId);

  const { error } = await supabaseAdmin.from("invoices").delete().eq("id", invoiceId);

  if (error) {
    throw error;
  }

  logger.info({ invoiceId }, "Invoice deleted");
}

/**
 * Submit invoice for approval
 */
export async function submitInvoiceForApproval(
  invoiceId: string,
  userId: string,
) {
  const { data: existingInvoice, error: existingInvoiceError } = await supabaseAdmin
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .single();

  if (existingInvoiceError || !existingInvoice) {
    throw new Error("Invoice not found");
  }

  if (existingInvoice.status === "pending_approval") {
    return getInvoiceById(invoiceId);
  }

  if (existingInvoice.status !== "draft") {
    throw new Error("Invoice not found or not in draft status");
  }

  const { error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "pending_approval",
      updated_at: getISTTimestamp(),
    })
    .eq("id", invoiceId);

  if (error) {
    throw new Error("Invoice not found or not in draft status");
  }

  const submittedInvoice = await getInvoiceById(invoiceId);

  if (submittedInvoice.status !== "pending_approval") {
    throw new Error(
      `Invoice submit failed: expected pending_approval, got ${submittedInvoice.status}`,
    );
  }

  // Create approval record
  const { data: existingApproval } = await supabaseAdmin
    .from("finance_approvals")
    .select("id")
    .eq("approval_type", "invoice")
    .eq("entity_id", invoiceId)
    .eq("status", "pending")
    .maybeSingle();

  if (!existingApproval) {
    await supabaseAdmin.from("finance_approvals").insert({
      approval_type: "invoice",
      entity_id: invoiceId,
      requested_by: userId,
    });
  }

  logger.info({ invoiceId }, "Invoice submitted for approval");
  return submittedInvoice;
}

/**
 * Approve invoice (Manager/Admin only)
 */
export async function approveInvoice(invoiceId: string, approvedBy: string) {
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "sent",
      approved_by: approvedBy,
      approved_at: getISTTimestamp(),
      updated_at: getISTTimestamp(),
    })
    .eq("id", invoiceId)
    .eq("status", "pending_approval")
    .select()
    .single();

  if (error || !invoice) {
    throw new Error("Invoice not found or not pending approval");
  }

  // Update approval record
  await supabaseAdmin
    .from("finance_approvals")
    .update({
      status: "approved",
      reviewed_by: approvedBy,
      reviewed_at: getISTTimestamp(),
    })
    .eq("entity_id", invoiceId)
    .eq("approval_type", "invoice")
    .eq("status", "pending");

  logger.info({ invoiceId, approvedBy }, "Invoice approved");
  return invoice;
}

/**
 * Reject invoice (Manager/Admin only)
 */
export async function rejectInvoice(
  invoiceId: string,
  rejectedBy: string,
  reason: string,
) {
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "draft",
      updated_at: getISTTimestamp(),
    })
    .eq("id", invoiceId)
    .eq("status", "pending_approval")
    .select()
    .single();

  if (error || !invoice) {
    throw new Error("Invoice not found or not pending approval");
  }

  // Update approval record
  await supabaseAdmin
    .from("finance_approvals")
    .update({
      status: "rejected",
      reviewed_by: rejectedBy,
      reviewed_at: getISTTimestamp(),
      comments: reason,
    })
    .eq("entity_id", invoiceId)
    .eq("approval_type", "invoice")
    .eq("status", "pending");

  logger.info({ invoiceId, rejectedBy, reason }, "Invoice rejected");
  return invoice;
}

/**
 * Cancel invoice (Manager/Admin only)
 */
export async function cancelInvoice(invoiceId: string, cancelledBy: string) {
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "cancelled",
      updated_at: getISTTimestamp(),
    })
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  logger.info({ invoiceId, cancelledBy }, "Invoice cancelled");
  return invoice;
}

/**
 * Mark invoice as sent
 */
export async function markInvoiceSent(invoiceId: string) {
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "sent",
      sent_at: getISTTimestamp(),
      updated_at: getISTTimestamp(),
    })
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return invoice;
}

/**
 * Check if invoice is overdue and update status
 */
export async function updateOverdueInvoices() {
  const today = getISTDate();

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "overdue",
      updated_at: getISTTimestamp(),
    })
    .eq("status", "sent")
    .lt("due_date", today)
    .select();

  if (error) {
    logger.error({ error }, "Error updating overdue invoices");
    return [];
  }

  if (data && data.length > 0) {
    logger.info({ count: data.length }, "Updated overdue invoices");
  }

  return data || [];
}

/**
 * Get invoice stats for dashboard
 */
export async function getInvoiceStats(departmentId?: string) {
  let query = supabaseAdmin
    .from("invoices")
    .select("status, total_amount, amount_paid");

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  const { data: invoices } = await query;

  if (!invoices) {
    return {
      total_revenue: 0,
      outstanding_amount: 0,
      overdue_count: 0,
      overdue_amount: 0,
      pending_approval_count: 0,
    };
  }

  const stats = invoices.reduce(
    (acc, inv) => {
      if (inv.status === "paid") {
        acc.total_revenue += Number(inv.amount_paid) || 0;
      }
      if (inv.status === "sent" || inv.status === "overdue") {
        acc.outstanding_amount +=
          Number(inv.total_amount) - Number(inv.amount_paid) || 0;
      }
      if (inv.status === "overdue") {
        acc.overdue_count += 1;
        acc.overdue_amount +=
          Number(inv.total_amount) - Number(inv.amount_paid) || 0;
      }
      if (inv.status === "pending_approval") {
        acc.pending_approval_count += 1;
      }
      return acc;
    },
    {
      total_revenue: 0,
      outstanding_amount: 0,
      overdue_count: 0,
      overdue_amount: 0,
      pending_approval_count: 0,
    },
  );

  return stats;
}

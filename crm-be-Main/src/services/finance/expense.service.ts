import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../utils/logger.js";
import { USER_ROLES } from "../../config/constants.js";
import { getISTDate, getISTTimestamp } from "../../utils/date-utils.js";

// Types
export interface CreateExpenseInput {
  category_id: string;
  amount: number;
  expense_date?: string;
  vendor_name?: string;
  description: string;
  receipt_url?: string;
  notes?: string;
  department_id?: string;
}

export interface ExpenseFilters {
  status?: string;
  category_id?: string;
  department_id?: string;
  submitted_by?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}

/**
 * Get expense categories
 */
export async function getExpenseCategories(activeOnly: boolean = true) {
  let query = supabaseAdmin
    .from("expense_categories")
    .select("*")
    .order("name");

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Create expense category (Admin only)
 */
export async function createExpenseCategory(input: {
  name: string;
  description?: string;
  monthly_budget?: number;
}) {
  const { data, error } = await supabaseAdmin
    .from("expense_categories")
    .insert({
      name: input.name,
      description: input.description,
      monthly_budget: input.monthly_budget,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update expense category (Admin only)
 */
export async function updateExpenseCategory(
  categoryId: string,
  input: Partial<{
    name: string;
    description: string;
    monthly_budget: number;
    is_active: boolean;
  }>,
) {
  const { data, error } = await supabaseAdmin
    .from("expense_categories")
    .update(input)
    .eq("id", categoryId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get expenses with role-based filtering
 */
export async function getExpenses(
  userId: string,
  role: string,
  departmentId: string | null,
  filters: ExpenseFilters = {},
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
  let query = supabaseAdmin.from("expenses").select(
    `
      *,
      category:expense_categories(id, name),
      submitter:users!expenses_submitted_by_fkey(id, full_name, email),
      approver:users!expenses_approved_by_fkey(id, full_name),
      payer:users!expenses_paid_by_fkey(id, full_name),
      department:departments(id, name)
    `,
    { count: "exact" },
  );

  // Role-based filtering with department security
  if (role === USER_ROLES.EMPLOYEE) {
    query = query.eq("submitted_by", userId);
  } else if (role === USER_ROLES.MANAGER && departmentId) {
    // Managers see only expenses in their department
    query = query.eq("department_id", departmentId);
  }
  // Admins see all expenses (no filter)

  // Apply filters
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.category_id) {
    query = query.eq("category_id", filters.category_id);
  }
  if (filters.department_id) {
    query = query.eq("department_id", filters.department_id);
  }
  if (filters.submitted_by) {
    query = query.eq("submitted_by", filters.submitted_by);
  }
  if (filters.from_date) {
    query = query.gte("expense_date", filters.from_date);
  }
  if (filters.to_date) {
    query = query.lte("expense_date", filters.to_date);
  }
  if (filters.search) {
    query = query.or(
      `description.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%`,
    );
  }

  query = query
    .order("created_at", { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error({ error }, "Error fetching expenses");
    throw error;
  }

  return { data: data || [], total: count || 0 };
}

/**
 * Get single expense by ID
 */
export async function getExpenseById(expenseId: string) {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select(
      `
      *,
      category:expense_categories(id, name),
      submitter:users!expenses_submitted_by_fkey(id, full_name, email),
      approver:users!expenses_approved_by_fkey(id, full_name),
      payer:users!expenses_paid_by_fkey(id, full_name),
      department:departments(id, name)
    `,
    )
    .eq("id", expenseId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Submit new expense
 */
export async function submitExpense(
  input: CreateExpenseInput,
  submittedBy: string,
) {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .insert({
      category_id: input.category_id,
      amount: input.amount,
      expense_date: input.expense_date || getISTDate(),
      vendor_name: input.vendor_name,
      description: input.description,
      receipt_url: input.receipt_url,
      notes: input.notes,
      department_id: input.department_id,
      submitted_by: submittedBy,
      paid_by: submittedBy, // Assume employee paid
      status: "pending",
    })
    .select(
      `
      *,
      category:expense_categories(id, name)
    `,
    )
    .single();

  if (error) {
    logger.error({ error }, "Error submitting expense");
    throw error;
  }

  // Create approval record
  await supabaseAdmin.from("finance_approvals").insert({
    approval_type: "expense",
    entity_id: data.id,
    requested_by: submittedBy,
  });

  logger.info({ expenseId: data.id, submittedBy }, "Expense submitted");
  return data;
}

/**
 * Update pending expense
 */
export async function updateExpense(
  expenseId: string,
  input: Partial<CreateExpenseInput>,
  userId: string,
) {
  // Check expense exists and is pending
  const { data: existing } = await supabaseAdmin
    .from("expenses")
    .select("status, submitted_by")
    .eq("id", expenseId)
    .single();

  if (!existing) {
    throw new Error("Expense not found");
  }

  if (existing.status !== "pending") {
    throw new Error("Only pending expenses can be edited");
  }

  if (existing.submitted_by !== userId) {
    throw new Error("You can only edit your own expenses");
  }

  const updateData: Record<string, unknown> = {
    updated_at: getISTTimestamp(),
  };

  if (input.category_id) updateData.category_id = input.category_id;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.expense_date) updateData.expense_date = input.expense_date;
  if (input.vendor_name !== undefined)
    updateData.vendor_name = input.vendor_name;
  if (input.description) updateData.description = input.description;
  if (input.receipt_url !== undefined)
    updateData.receipt_url = input.receipt_url;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabaseAdmin
    .from("expenses")
    .update(updateData)
    .eq("id", expenseId)
    .select(
      `
      *,
      category:expense_categories(id, name)
    `,
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Approve expense (Manager/Admin only)
 */
export async function approveExpense(expenseId: string, approvedBy: string) {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: getISTTimestamp(),
      updated_at: getISTTimestamp(),
    })
    .eq("id", expenseId)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !data) {
    throw new Error("Expense not found or not pending");
  }

  // Update approval record
  await supabaseAdmin
    .from("finance_approvals")
    .update({
      status: "approved",
      reviewed_by: approvedBy,
      reviewed_at: getISTTimestamp(),
    })
    .eq("entity_id", expenseId)
    .eq("approval_type", "expense")
    .eq("status", "pending");

  logger.info({ expenseId, approvedBy }, "Expense approved");
  return data;
}

/**
 * Reject expense (Manager/Admin only)
 */
export async function rejectExpense(
  expenseId: string,
  rejectedBy: string,
  reason: string,
) {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .update({
      status: "rejected",
      approved_by: rejectedBy,
      approved_at: getISTTimestamp(),
      rejection_reason: reason,
      updated_at: getISTTimestamp(),
    })
    .eq("id", expenseId)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !data) {
    throw new Error("Expense not found or not pending");
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
    .eq("entity_id", expenseId)
    .eq("approval_type", "expense")
    .eq("status", "pending");

  logger.info({ expenseId, rejectedBy, reason }, "Expense rejected");
  return data;
}

/**
 * Get expense stats for dashboard
 */
export async function getExpenseStats(
  departmentId?: string,
  fromDate?: string,
  toDate?: string,
  userId?: string,
) {
  let query = supabaseAdmin
    .from("expenses")
    .select(
      `
      amount,
      status,
      expense_date,
      category:expense_categories(id, name)
    `,
    )
    .eq("status", "approved");

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }
  if (fromDate) {
    query = query.gte("expense_date", fromDate);
  }
  if (toDate) {
    query = query.lte("expense_date", toDate);
  }
  if (userId) {
    query = query.eq("submitted_by", userId);
  }

  const { data } = await query;

  if (!data) {
    return {
      total_expenses: 0,
      by_category: {},
      pending_count: 0,
    };
  }

  const stats = data.reduce(
    (acc, expense) => {
      const amount = Number(expense.amount) || 0;
      acc.total_expenses += amount;
      const categoryName = (expense.category as any)?.name || "Uncategorized";
      acc.by_category[categoryName] =
        (acc.by_category[categoryName] || 0) + amount;
      return acc;
    },
    { total_expenses: 0, by_category: {} as Record<string, number> },
  );

  // Get pending count
  let pendingQuery = supabaseAdmin
    .from("expenses")
    .select("id", { count: "exact" })
    .eq("status", "pending");

  if (departmentId) {
    pendingQuery = pendingQuery.eq("department_id", departmentId);
  }
  if (userId) {
    pendingQuery = pendingQuery.eq("submitted_by", userId);
  }

  const { count } = await pendingQuery;

  return {
    ...stats,
    pending_count: count || 0,
  };
}

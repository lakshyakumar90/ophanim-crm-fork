import { supabaseAdmin } from "../../../config/supabase.js";
import { logger } from "../../../utils/logger.js";
import { USER_ROLES } from "../../../config/constants.js";
import { getISTTimestamp } from "../../../utils/date-utils.js";

export interface BudgetLineInput {
  id?: string;
  category_id?: string;
  description: string;
  allocated_amount: number;
  notes?: string;
  sort_order?: number;
}

export interface CreateBudgetInput {
  name: string;
  fiscal_year: number;
  period: "monthly" | "quarterly" | "yearly";
  period_start: string;
  period_end: string;
  department_id?: string;
  status?: "draft" | "active" | "closed";
  currency?: "USD" | "CAD" | "GBP" | "EUR" | "INR";
  notes?: string;
  lines: BudgetLineInput[];
}

export interface UpdateBudgetInput extends Partial<Omit<CreateBudgetInput, "lines">> {
  lines?: BudgetLineInput[];
}

export interface BudgetFilters {
  status?: string;
  department_id?: string;
  fiscal_year?: number;
  search?: string;
}

async function getSpentByCategory(
  categoryIds: string[],
  periodStart: string,
  periodEnd: string,
  departmentId?: string | null,
) {
  if (categoryIds.length === 0) {
    return new Map<string, number>();
  }

  let query = supabaseAdmin
    .from("expenses")
    .select("category_id, amount")
    .eq("status", "approved")
    .in("category_id", categoryIds)
    .gte("expense_date", periodStart)
    .lte("expense_date", periodEnd);

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const spent = new Map<string, number>();
  for (const row of data || []) {
    if (!row.category_id) continue;
    const current = spent.get(row.category_id) || 0;
    spent.set(row.category_id, current + Number(row.amount || 0));
  }
  return spent;
}

function enrichLinesWithSpent(
  lines: Array<Record<string, unknown>>,
  spentByCategory: Map<string, number>,
) {
  return lines.map((line) => {
    const categoryId = line.category_id as string | undefined;
    const spent = categoryId ? spentByCategory.get(categoryId) || 0 : 0;
    const allocated = Number(line.allocated_amount || 0);
    return {
      ...line,
      spent_amount: spent,
      remaining_amount: allocated - spent,
      utilization_pct: allocated > 0 ? (spent / allocated) * 100 : 0,
    };
  });
}

export async function getBudgets(
  userId: string,
  role: string,
  departmentId: string | null,
  filters: BudgetFilters = {},
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
  let query = supabaseAdmin.from("budgets").select(
    `
      *,
      department:departments(id, name),
      creator:users!budgets_created_by_fkey(id, full_name, email)
    `,
    { count: "exact" },
  );

  if (role === USER_ROLES.MANAGER && departmentId) {
    query = query.eq("department_id", departmentId);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.department_id) {
    query = query.eq("department_id", filters.department_id);
  }
  if (filters.fiscal_year) {
    query = query.eq("fiscal_year", filters.fiscal_year);
  }
  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);

  const { data, error, count } = await query;
  if (error) {
    logger.error({ error }, "Error fetching budgets");
    throw error;
  }

  return { data: data || [], total: count || 0 };
}

export async function getBudgetById(budgetId: string) {
  const { data: budget, error } = await supabaseAdmin
    .from("budgets")
    .select(
      `
      *,
      department:departments(id, name),
      creator:users!budgets_created_by_fkey(id, full_name, email)
    `,
    )
    .eq("id", budgetId)
    .single();

  if (error) {
    throw error;
  }

  const { data: lines } = await supabaseAdmin
    .from("budget_lines")
    .select(
      `
      *,
      category:expense_categories(id, name)
    `,
    )
    .eq("budget_id", budgetId)
    .order("sort_order");

  const categoryIds = (lines || [])
    .map((l) => l.category_id)
    .filter((id): id is string => Boolean(id));

  const spentByCategory = await getSpentByCategory(
    categoryIds,
    budget.period_start,
    budget.period_end,
    budget.department_id,
  );

  const enrichedLines = enrichLinesWithSpent(lines || [], spentByCategory);
  const totalSpent = enrichedLines.reduce(
    (sum, line) => sum + Number(line.spent_amount || 0),
    0,
  );

  return {
    ...budget,
    lines: enrichedLines,
    total_spent: totalSpent,
    total_remaining: Number(budget.total_allocated || 0) - totalSpent,
  };
}

export async function createBudget(input: CreateBudgetInput, createdBy: string) {
  const { data: budget, error } = await supabaseAdmin
    .from("budgets")
    .insert({
      name: input.name,
      fiscal_year: input.fiscal_year,
      period: input.period,
      period_start: input.period_start,
      period_end: input.period_end,
      department_id: input.department_id,
      status: input.status || "draft",
      currency: input.currency || "INR",
      notes: input.notes,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, "Error creating budget");
    throw error;
  }

  if (input.lines.length > 0) {
    const { error: linesError } = await supabaseAdmin.from("budget_lines").insert(
      input.lines.map((line, index) => ({
        budget_id: budget.id,
        category_id: line.category_id,
        description: line.description,
        allocated_amount: line.allocated_amount,
        notes: line.notes,
        sort_order: line.sort_order ?? index,
      })),
    );

    if (linesError) {
      await supabaseAdmin.from("budgets").delete().eq("id", budget.id);
      throw linesError;
    }
  }

  logger.info({ budgetId: budget.id }, "Budget created");
  return getBudgetById(budget.id);
}

export async function updateBudget(budgetId: string, input: UpdateBudgetInput) {
  const updateData: Record<string, unknown> = { updated_at: getISTTimestamp() };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.fiscal_year !== undefined) updateData.fiscal_year = input.fiscal_year;
  if (input.period !== undefined) updateData.period = input.period;
  if (input.period_start !== undefined) updateData.period_start = input.period_start;
  if (input.period_end !== undefined) updateData.period_end = input.period_end;
  if (input.department_id !== undefined) updateData.department_id = input.department_id;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { error } = await supabaseAdmin
    .from("budgets")
    .update(updateData)
    .eq("id", budgetId);

  if (error) {
    throw error;
  }

  if (input.lines) {
    await supabaseAdmin.from("budget_lines").delete().eq("budget_id", budgetId);

    if (input.lines.length > 0) {
      const { error: linesError } = await supabaseAdmin.from("budget_lines").insert(
        input.lines.map((line, index) => ({
          budget_id: budgetId,
          category_id: line.category_id,
          description: line.description,
          allocated_amount: line.allocated_amount,
          notes: line.notes,
          sort_order: line.sort_order ?? index,
        })),
      );

      if (linesError) {
        throw linesError;
      }
    }
  }

  return getBudgetById(budgetId);
}

export async function deleteBudget(budgetId: string) {
  await supabaseAdmin.from("budget_lines").delete().eq("budget_id", budgetId);

  const { error } = await supabaseAdmin.from("budgets").delete().eq("id", budgetId);
  if (error) {
    throw error;
  }

  logger.info({ budgetId }, "Budget deleted");
}

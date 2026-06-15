import { getInvoiceStats } from "./invoice.service.js";
import { getExpenseStats } from "./expense.service.js";
import { getPaymentStats } from "./payment.service.js";
import { getPendingApprovalCount } from "./approval.service.js";
import { supabaseAdmin } from "../../../config/supabase.js";
import { getISTDate } from "../../../utils/date-utils.js";

/**
 * Get finance dashboard data
 */
export async function getFinanceDashboard(
  departmentId?: string,
  userId?: string,
) {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Get all stats in parallel
  const [invoiceStats, expenseStats, paymentStats, pendingApprovals] =
    await Promise.all([
      getInvoiceStats(departmentId), // Invoices might be department-wide or specific? Usually department.
      getExpenseStats(departmentId, firstDayOfMonth, lastDayOfMonth, userId),
      getPaymentStats(departmentId, firstDayOfMonth, lastDayOfMonth),
      getPendingApprovalCount(), // This needs user filtering too if for employee? Actually approving is for managers.
    ]);

  // Calculate net balance (Revenue - Expenses, NOT profit)
  const netBalance = invoiceStats.total_revenue - expenseStats.total_expenses;

  return {
    summary: {
      total_revenue: invoiceStats.total_revenue,
      outstanding_amount: invoiceStats.outstanding_amount,
      this_month_expenses: expenseStats.total_expenses,
      net_balance: netBalance,
      pending_approvals: pendingApprovals,
      overdue_invoices: invoiceStats.overdue_count,
      overdue_amount: invoiceStats.overdue_amount,
    },
    expense_breakdown: expenseStats.by_category,
    payment_by_mode: paymentStats.by_mode,
  };
}

/**
 * Get monthly revenue trend (last 12 months)
 */
export async function getMonthlyRevenueTrend(departmentId?: string) {
  const months: { month: string; revenue: number; expenses: number }[] = [];
  const today = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = date.toISOString().slice(0, 7); // YYYY-MM
    const firstDay = `${month}-01`;
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    // Get revenue for this month
    let revenueQuery = supabaseAdmin
      .from("payments")
      .select(
        `
        amount,
        invoice:invoices!inner(department_id)
      `,
      )
      .eq("status", "success")
      .gte("payment_date", firstDay)
      .lte("payment_date", lastDay);

    if (departmentId) {
      revenueQuery = revenueQuery.eq("invoice.department_id", departmentId);
    }

    const { data: payments } = await revenueQuery;
    const revenue = (payments || []).reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    // Get expenses for this month
    let expenseQuery = supabaseAdmin
      .from("expenses")
      .select("amount")
      .eq("status", "approved")
      .gte("expense_date", firstDay)
      .lte("expense_date", lastDay);

    if (departmentId) {
      expenseQuery = expenseQuery.eq("department_id", departmentId);
    }

    const { data: expenseData } = await expenseQuery;
    const expenses = (expenseData || []).reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );

    months.push({
      month,
      revenue,
      expenses,
    });
  }

  return months;
}

/**
 * Get invoice status distribution
 */
export async function getInvoiceStatusDistribution(departmentId?: string) {
  let query = supabaseAdmin.from("invoices").select("status");

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  const { data } = await query;

  if (!data) {
    return [];
  }

  const distribution = data.reduce(
    (acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return Object.entries(distribution).map(([status, count]) => ({
    status,
    count,
  }));
}

/**
 * Get top clients by outstanding amount
 */
export async function getTopOutstandingClients(
  departmentId?: string,
  limit: number = 5,
) {
  let query = supabaseAdmin
    .from("invoices")
    .select("client_name, total_amount, amount_paid")
    .in("status", ["sent", "overdue"]);

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  const { data } = await query;

  if (!data) {
    return [];
  }

  // Group by client
  const clientOutstanding = data.reduce(
    (acc, inv) => {
      const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
      acc[inv.client_name] = (acc[inv.client_name] || 0) + outstanding;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Sort and return top N
  return Object.entries(clientOutstanding)
    .map(([client, outstanding]) => ({ client, outstanding }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, limit);
}

/**
 * Get recent activity for finance dashboard
 */
export async function getRecentFinanceActivity(
  departmentId?: string,
  limit: number = 10,
  userId?: string,
) {
  const activities: Array<{
    type: string;
    description: string;
    amount?: number;
    timestamp: string;
  }> = [];

  // Get recent invoices
  let invoiceQuery = supabaseAdmin
    .from("invoices")
    .select("invoice_number, client_name, total_amount, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (departmentId) {
    invoiceQuery = invoiceQuery.eq("department_id", departmentId);
  }

  const { data: invoices } = await invoiceQuery;
  // If employee, maybe they shouldn't see ALL invoices? For now, we assume they can see dept invoices,
  // or we need to filter by created_by if strict.
  // Assuming invoices are visible to department. User filtering for invoices is less common for "personal dash" unless sales.
  (invoices || []).forEach((inv) => {
    activities.push({
      type: "invoice",
      description: `Invoice ${inv.invoice_number} for ${inv.client_name} (${inv.status})`,
      amount: Number(inv.total_amount),
      timestamp: inv.created_at,
    });
  });

  // Get recent payments
  let paymentQuery = supabaseAdmin
    .from("payments")
    .select(
      `
      amount,
      payment_date,
      created_at,
      invoice:invoices(invoice_number, department_id)
    `,
    )
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: payments } = await paymentQuery;
  (payments || []).forEach((payment) => {
    if (
      !departmentId ||
      (payment.invoice as any)?.department_id === departmentId
    ) {
      activities.push({
        type: "payment",
        description: `Payment received for ${(payment.invoice as any)?.invoice_number}`,
        amount: Number(payment.amount),
        timestamp: payment.created_at,
      });
    }
  });

  // Get recent expenses
  let expenseQuery = supabaseAdmin
    .from("expenses")
    .select("expense_number, description, amount, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (departmentId) {
    expenseQuery = expenseQuery.eq("department_id", departmentId);
  }
  if (userId) {
    expenseQuery = expenseQuery.eq("submitted_by", userId);
  }

  const { data: expenses } = await expenseQuery;
  (expenses || []).forEach((exp) => {
    activities.push({
      type: "expense",
      description: `Expense ${exp.expense_number}: ${exp.description} (${exp.status})`,
      amount: Number(exp.amount),
      timestamp: exp.created_at,
    });
  });

  // Sort by timestamp and return limited
  return activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit);
}

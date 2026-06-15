import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { USER_ROLES } from "../../../config/constants.js";
import type { AuthUser } from "../../../types/api.types.js";
import {
  nowIST,
  getTodayIST,
  getTimestampIST,
  getMonthIST,
  getYearIST,
  getStartOfMonthIST,
  getStartOfTodayIST,
  getEndOfTodayIST,
} from "../../../utils/date-utils.js";
import * as invoiceService from "../../finance/services/invoice.service.js";
import * as expenseService from "../../finance/services/expense.service.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";

import {
  tryGetDashboardStatsRPC,
  tryGetLeadAggregationsRPC,
  fetchLeadIdsWithActivities,
  fetchLeadAnalyticsRowsByIds,
  fetchLeadAnalyticsRows,
  getScopedUserIds,
  type LeadAnalyticsRow,
  type LeadAnalyticsFilters,
  type UserWiseAnalyticsFilters,
} from "./dashboard.shared.js";

export async function getLeadTrendData(months: number = 6) {
  const now = new Date();

  // Build all month ranges upfront
  const monthRanges = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    monthRanges.push({
      monthStart: date.toISOString(),
      monthEnd: nextMonth.toISOString(),
      monthLabel: date.toLocaleString("default", { month: "short" }),
    });
  }

  // Execute all queries in parallel
  const results = await Promise.all(
    monthRanges.flatMap((range) => [
      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false)
        .gte("created_at", range.monthStart)
        .lt("created_at", range.monthEnd),
      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "won")
        .gte("converted_at", range.monthStart)
        .lt("converted_at", range.monthEnd),
    ]),
  );

  // Process results
  const trendData: { month: string; leads: number; converted: number }[] = [];
  for (let i = 0; i < monthRanges.length; i++) {
    const range = monthRanges[i];
    const leadsResult = results[i * 2];
    const convertedResult = results[i * 2 + 1];
    if (range && leadsResult && convertedResult) {
      trendData.push({
        month: range.monthLabel,
        leads: leadsResult.count || 0,
        converted: convertedResult.count || 0,
      });
    }
  }

  return trendData;
}

/**
 * Get revenue trend data for line chart
 * OPTIMIZED: Batch queries for all months in parallel
 */
export async function getRevenueTrendData(months: number = 6) {
  const now = new Date();

  // Build all month ranges upfront
  const monthRanges = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    monthRanges.push({
      monthStart: date.toISOString(),
      monthEnd: nextMonth.toISOString(),
      monthLabel: date.toLocaleString("default", { month: "short" }),
    });
  }

  // Execute all queries in parallel
  const results = await Promise.all(
    monthRanges.flatMap((range) => [
      supabaseAdmin
        .from("invoices")
        .select("total_amount")
        .eq("status", "paid")
        .gte("paid_at", range.monthStart)
        .lt("paid_at", range.monthEnd),
      supabaseAdmin
        .from("expenses")
        .select("amount")
        .eq("status", "approved")
        .gte("expense_date", range.monthStart.split("T")[0])
        .lt("expense_date", range.monthEnd.split("T")[0]),
    ]),
  );

  // Process results
  const trendData: { month: string; revenue: number; expenses: number }[] = [];
  for (let i = 0; i < monthRanges.length; i++) {
    const invoicesResult = results[i * 2];
    const expensesResult = results[i * 2 + 1];
    const invoices = invoicesResult?.data || [];
    const expenses = expensesResult?.data || [];

    const revenue = invoices.reduce(
      (sum: number, inv: any) => sum + (Number(inv.total_amount) || 0),
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum: number, exp: any) => sum + (Number(exp.amount) || 0),
      0,
    );

    const range = monthRanges[i];
    if (range) {
      trendData.push({
        month: range.monthLabel,
        revenue,
        expenses: totalExpenses,
      });
    }
  }

  return trendData;
}

/**
 * Get project status distribution
 */
export async function getProjectStatusData() {
  const { data } = await supabaseAdmin
    .from("projects")
    .select("status")
    .eq("is_deleted", false);

  const distribution: Record<string, number> = {};
  for (const project of data || []) {
    const status = (project as { status: string }).status;
    distribution[status] = (distribution[status] || 0) + 1;
  }

  return Object.entries(distribution).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value,
  }));
}

/**
 * Get department performance comparison
 * OPTIMIZED: Single batch query approach instead of N+1 queries per department
 */
export async function getDepartmentPerformance() {
  const { data: departments } = await supabaseAdmin
    .from("departments")
    .select("id, name, slug");

  if (!departments || departments.length === 0) {
    return [];
  }

  const deptIds = departments.map((d: any) => d.id);

  // Batch all data fetching in parallel instead of per-department sequential
  const [teamsData, leadsData, invoicesData] = await Promise.all([
    // Get all teams with their department IDs
    supabaseAdmin.from("teams").select("id, department_id").in("department_id", deptIds),
    // Get all leads counts by department
    supabaseAdmin
      .from("leads")
      .select("department_id")
      .eq("is_deleted", false)
      .in("department_id", deptIds),
    // Get all paid invoices by department
    supabaseAdmin
      .from("invoices")
      .select("department_id, total_amount")
      .eq("status", "paid")
      .in("department_id", deptIds),
  ]);

  // Build team to department mapping
  const teamToDept: Record<string, string> = {};
  for (const team of teamsData.data || []) {
    const t = team as { id: string; department_id: string };
    teamToDept[t.id] = t.department_id;
  }

  // Get users in these teams
  const teamIds = Object.keys(teamToDept);
  let usersData: any[] = [];
  let completedTasksData: any[] = [];

  if (teamIds.length > 0) {
    const [users, tasks] = await Promise.all([
      supabaseAdmin.from("users").select("id, team_id").in("team_id", teamIds),
      supabaseAdmin
        .from("tasks")
        .select("assigned_to")
        .eq("status", "completed"),
    ]);
    usersData = users.data || [];
    completedTasksData = tasks.data || [];
  }

  // Build user to department mapping
  const userToDept: Record<string, string> = {};
  for (const user of usersData) {
    const u = user as { id: string; team_id: string };
    const deptId = teamToDept[u.team_id];
    if (deptId) {
      userToDept[u.id] = deptId;
    }
  }

  // Count tasks per department
  const tasksByDept: Record<string, number> = {};
  for (const task of completedTasksData) {
    const t = task as { assigned_to: string };
    const deptId = userToDept[t.assigned_to];
    if (deptId) {
      tasksByDept[deptId] = (tasksByDept[deptId] || 0) + 1;
    }
  }

  // Count leads per department
  const leadsByDept: Record<string, number> = {};
  for (const lead of leadsData.data || []) {
    const l = lead as { department_id: string };
    leadsByDept[l.department_id] = (leadsByDept[l.department_id] || 0) + 1;
  }

  // Sum revenue per department
  const revenueByDept: Record<string, number> = {};
  for (const inv of invoicesData.data || []) {
    const i = inv as { department_id: string; total_amount: number };
    revenueByDept[i.department_id] =
      (revenueByDept[i.department_id] || 0) + (Number(i.total_amount) || 0);
  }

  // Build final result
  return departments.map((dept: any) => {
    const d = dept as { id: string; name: string; slug: string };
    return {
      name: d.name,
      leads: leadsByDept[d.id] || 0,
      tasks: tasksByDept[d.id] || 0,
      revenue: revenueByDept[d.id] || 0,
    };
  });
}

/**
 * Get top performers
 * OPTIMIZED: Single batch queries instead of N queries per user
 */
export async function getTopPerformers(limit: number = 5) {
  const startOfMonth = getStartOfMonthIST(getYearIST(), getMonthIST());

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, full_name, avatar_url, role")
    .eq("is_active", true)
    .neq("role", "admin");

  if (!users || users.length === 0) {
    return [];
  }

  const userIds = users.map((u: any) => u.id);

  // Batch all performance data in parallel - 2 queries instead of 2*N queries
  const [leadsWonData, tasksCompletedData] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("assigned_to")
      .in("assigned_to", userIds)
      .eq("status", "won")
      .gte("converted_at", startOfMonth),
    supabaseAdmin
      .from("tasks")
      .select("assigned_to")
      .in("assigned_to", userIds)
      .eq("status", "completed")
      .gte("completed_at", startOfMonth),
  ]);

  // Count leads won per user
  const leadsWonByUser: Record<string, number> = {};
  for (const lead of leadsWonData.data || []) {
    const l = lead as { assigned_to: string };
    leadsWonByUser[l.assigned_to] = (leadsWonByUser[l.assigned_to] || 0) + 1;
  }

  // Count tasks completed per user
  const tasksCompletedByUser: Record<string, number> = {};
  for (const task of tasksCompletedData.data || []) {
    const t = task as { assigned_to: string };
    tasksCompletedByUser[t.assigned_to] =
      (tasksCompletedByUser[t.assigned_to] || 0) + 1;
  }

  // Calculate scores for all users
  const userStats = users.map((user: any) => {
    const u = user as {
      id: string;
      full_name: string;
      avatar_url: string | null;
      role: string;
    };
    const leadsWon = leadsWonByUser[u.id] || 0;
    const tasksCompleted = tasksCompletedByUser[u.id] || 0;
    const score = leadsWon * 10 + tasksCompleted * 2;

    return {
      id: u.id,
      name: u.full_name,
      avatar: u.avatar_url,
      role: u.role,
      leadsWon,
      tasksCompleted,
      score,
    };
  });

  // Filter and sort
  return userStats
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

import { supabaseAdmin } from "../../../config/supabase.js";
import { USER_ROLES } from "../../../config/constants.js";
import type { AuthUser } from "../../../types/api.types.js";
import { getTimestampIST } from "../../../utils/date-utils.js";

interface SearchResult {
  type: "lead" | "task" | "invoice" | "expense" | "user";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  metadata?: Record<string, any>;
}

interface SearchFilters {
  type?: string;
  duration?: string;
}

/**
 * Get all team member IDs for a manager (includes the manager themselves)
 * Used for team-based search filtering
 */
async function getTeamMemberIds(
  managerId: string,
  teamId: string,
): Promise<string[]> {
  const { data: teamMembers } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("team_id", teamId)
    .eq("is_active", true);

  const memberIds = (teamMembers || []).map((u: any) => u.id);

  // Ensure manager is included
  if (!memberIds.includes(managerId)) {
    memberIds.push(managerId);
  }

  return memberIds;
}

/**
 * Global search across all entities
 * OPTIMIZED: Uses PostgreSQL full-text search with tsvector for fast results
 * Falls back to ILIKE if full-text search is not available
 */
export async function searchGlobal(
  query: string,
  user: AuthUser,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  // Try to use the optimized PostgreSQL function first
  const useFullTextSearch = await tryFullTextSearch(query, user, filters);
  if (useFullTextSearch !== null) {
    return useFullTextSearch;
  }

  // Fallback to traditional ILIKE search
  return traditionalSearch(query, user, filters);
}

/**
 * Try full-text search using PostgreSQL RPC function
 * Returns null if the function doesn't exist (migration not run)
 */
async function tryFullTextSearch(
  query: string,
  user: AuthUser,
  filters?: SearchFilters,
): Promise<SearchResult[] | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc("global_search", {
      p_query: query,
      p_user_role: user.role,
      p_user_id: user.id,
      p_department_id: user.departmentId || null,
      p_team_id: user.teamId || null,
      p_limit: 15,
    });

    if (error) {
      // Function doesn't exist or other error - fall back to traditional search
      console.warn(
        "Full-text search unavailable, using fallback:",
        error.message,
      );
      return null;
    }

    // Map database results to SearchResult format
    const results: SearchResult[] = (data || []).map((row: any) => ({
      type: row.entity_type as SearchResult["type"],
      id: row.entity_id,
      title: row.title,
      subtitle: row.subtitle,
      url: row.url,
      metadata: { rank: row.rank },
    }));

    // Apply type filter if specified
    if (filters?.type && filters.type !== "all") {
      return results.filter((r) => r.type === filters.type);
    }

    return results;
  } catch (error) {
    console.warn("Full-text search error:", error);
    return null;
  }
}

/**
 * Traditional ILIKE search (fallback)
 * Used when full-text search migration hasn't been run
 */
async function traditionalSearch(
  query: string,
  user: AuthUser,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  const searchTerm = `%${query}%`;
  const promises = [];

  // Date filtering logic
  let validStartDate: string | undefined;
  if (filters?.duration && filters.duration !== "all") {
    const now = new Date();
    if (filters.duration === "today") {
      now.setHours(0, 0, 0, 0);
      validStartDate = now.toISOString();
    } else if (filters.duration === "week") {
      now.setDate(now.getDate() - 7);
      validStartDate = now.toISOString();
    } else if (filters.duration === "month") {
      now.setMonth(now.getMonth() - 1);
      validStartDate = now.toISOString();
    } else if (filters.duration === "quarter") {
      now.setMonth(now.getMonth() - 3);
      validStartDate = now.toISOString();
    } else if (filters.duration === "half_year") {
      now.setMonth(now.getMonth() - 6);
      validStartDate = now.toISOString();
    }
  }

  const shouldSearch = (type: string) => {
    return !filters?.type || filters.type === "all" || filters.type === type;
  };

  // Search Leads
  if (shouldSearch("lead")) {
    const searchLeads = async () => {
      let leadQuery = supabaseAdmin
        .from("leads")
        .select(
          `id, lead_name, business_name, email, status,
           department:departments!department_id(slug)`,
        )
        .or(
          `lead_name.ilike.${searchTerm},business_name.ilike.${searchTerm},email.ilike.${searchTerm}`,
        )
        .eq("is_deleted", false)
        .limit(5);

      if (user.role === USER_ROLES.EMPLOYEE) {
        leadQuery = leadQuery.eq("assigned_to", user.id);
      } else if (user.role === USER_ROLES.MANAGER && user.teamId) {
        // Manager sees their leads + leads assigned to their team members
        const teamMemberIds = await getTeamMemberIds(user.id, user.teamId);
        leadQuery = leadQuery.in("assigned_to", teamMemberIds);
      }

      if (validStartDate) {
        leadQuery = leadQuery.gte("created_at", validStartDate);
      }

      const { data } = await leadQuery;
      return (data || []).map((lead: any) => {
        const slug = lead.department?.slug || "sales";
        return {
          type: "lead" as const,
          id: lead.id,
          title: lead.lead_name,
          subtitle: lead.business_name || lead.email,
          url: `/${slug}/leads/${lead.id}`,
          metadata: { status: lead.status },
        };
      });
    };
    promises.push(searchLeads());
  }

  // Search Tasks
  if (shouldSearch("task")) {
    const searchTasks = async () => {
      let taskQuery = supabaseAdmin
        .from("tasks")
        .select(
          `id, title, status,
           lead:leads(lead_name),
           department:departments!department_id(slug)`,
        )
        .ilike("title", searchTerm)
        .limit(5);

      if (user.role === USER_ROLES.EMPLOYEE) {
        taskQuery = taskQuery.eq("assigned_to", user.id);
      } else if (user.role === USER_ROLES.MANAGER && user.teamId) {
        // Manager sees tasks assigned to themselves + their team members
        const teamMemberIds = await getTeamMemberIds(user.id, user.teamId);
        taskQuery = taskQuery.in("assigned_to", teamMemberIds);
      }

      if (validStartDate) {
        taskQuery = taskQuery.gte("created_at", validStartDate);
      }

      const { data } = await taskQuery;
      return (data || []).map((task: any) => {
        const slug = task.department?.slug || "sales";
        return {
          type: "task" as const,
          id: task.id,
          title: task.title,
          subtitle: task.lead?.lead_name
            ? `For: ${task.lead.lead_name}`
            : undefined,
          url: `/${slug}/tasks`,
          metadata: { status: task.status, leadId: task.lead?.id },
        };
      });
    };
    promises.push(searchTasks());
  }

  // Search Invoices
  if (shouldSearch("invoice")) {
    const searchInvoices = async () => {
      let q = supabaseAdmin
        .from("invoices")
        .select("id, invoice_number, client_name, total_amount")
        .or(
          `invoice_number.ilike.${searchTerm},client_name.ilike.${searchTerm}`,
        )
        .limit(3);

      if (user.role === USER_ROLES.EMPLOYEE) {
        q = q.eq("created_by", user.id);
      } else if (user.role === USER_ROLES.MANAGER && user.departmentId) {
        q = q.eq("department_id", user.departmentId);
      }

      if (validStartDate) q = q.gte("created_at", validStartDate);

      const { data } = await q;
      return (data || []).map((inv: any) => ({
        type: "invoice" as const,
        id: inv.id,
        title: inv.invoice_number,
        subtitle: `${inv.client_name} - ₹${inv.total_amount}`,
        url: `/finance/invoices/${inv.id}`,
      }));
    };
    promises.push(searchInvoices());
  }

  // Search Expenses
  if (shouldSearch("expense")) {
    const searchExpenses = async () => {
      let q = supabaseAdmin
        .from("expenses")
        .select("id, description, amount, vendor_name")
        .or(`description.ilike.${searchTerm},vendor_name.ilike.${searchTerm}`)
        .limit(3);

      if (user.role === USER_ROLES.EMPLOYEE) {
        q = q.eq("submitted_by", user.id);
      } else if (user.role === USER_ROLES.MANAGER && user.departmentId) {
        q = q.eq("department_id", user.departmentId);
      }

      if (validStartDate) q = q.gte("created_at", validStartDate);

      const { data } = await q;
      return (data || []).map((exp: any) => ({
        type: "expense" as const,
        id: exp.id,
        title: exp.description,
        subtitle: `${exp.vendor_name || "Unknown"} - ₹${exp.amount}`,
        url: `/finance/expenses/${exp.id}`,
      }));
    };
    promises.push(searchExpenses());
  }

  // Search Users (Admin and Manager only)
  if (
    shouldSearch("user") &&
    (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MANAGER)
  ) {
    const searchUsers = async () => {
      let q = supabaseAdmin
        .from("users")
        .select("id, full_name, email, role, job_title")
        .or(
          `full_name.ilike.${searchTerm},email.ilike.${searchTerm},job_title.ilike.${searchTerm}`,
        )
        .limit(3);

      if (user.role === USER_ROLES.MANAGER && user.departmentId) {
        q = q.eq("department_id", user.departmentId);
      }

      if (validStartDate) q = q.gte("created_at", validStartDate);

      const { data } = await q;
      return (data || []).map((u: any) => {
        const jobTitleLabel = u.job_title
          ? u.job_title
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase())
          : null;
        const subtitle = jobTitleLabel
          ? `${u.email} • ${jobTitleLabel}`
          : `${u.email} (${u.role})`;
        return {
          type: "user" as const,
          id: u.id,
          title: u.full_name,
          subtitle,
          url: `/global/users`,
        };
      });
    };
    promises.push(searchUsers());
  }

  const resultsArrays = await Promise.all(promises);
  return resultsArrays.flat();
}

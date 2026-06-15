import { supabase } from "../../supabase";
import { mapToCamelCase } from "../map-to-camel";

// ===================
// LEAVE MANAGEMENT
// ===================

export async function getLeaveTypes() {
  const { data, error } = await supabase
    .from("leave_types")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching leave types:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getLeaveRequests(params?: {
  userId?: string;
  status?: string;
  year?: number;
}) {
  let query = supabase
    .from("leave_requests")
    .select(
      `*, leave_type:leave_types!leave_type_id(id, name, is_paid),
       user:users!user_id(id, full_name, avatar_url)`,
    )
    .order("created_at", { ascending: false });

  if (params?.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  if (params?.year) {
    query = query
      .gte("start_date", `${params.year}-01-01`)
      .lte("start_date", `${params.year}-12-31`);
  }

  const { data, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching leave requests:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getLeaveBalances(userId?: string, year?: number) {
  const currentYear = year || new Date().getFullYear();

  let query = supabase
    .from("leave_balances")
    .select(`*, leave_type:leave_types!leave_type_id(id, name)`)
    .eq("year", currentYear);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching leave balances:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

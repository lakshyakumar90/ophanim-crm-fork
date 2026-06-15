import { supabaseAdmin } from "../../../config/supabase.js";

import { ApiError } from "../../../utils/responses.js";

import { ERROR_CODES } from "../../../utils/error-codes.js";

import type { CreateHolidayInput } from "./attendance.validator.js";

/**
 * Get holidays
 */
export async function getHolidays(year?: number) {
  let query = supabaseAdmin.from("holidays").select("*").order("date");

  if (year) {
    query = query.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
  }

  const { data, error } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((holiday: any) => ({
    ...holiday,
    date: holiday.date || holiday.holiday_date,
  }));
}

/**
 * Create holiday (admin only)
 */
export async function createHoliday(input: CreateHolidayInput) {
  const { data: holidayColumns, error: holidayColumnsError } = await supabaseAdmin
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "holidays")
    .in("column_name", ["department_id", "team_id", "role", "user_role"]);

  const availableCols = new Set(
    holidayColumnsError ? [] : (holidayColumns || []).map((c: any) => c.column_name as string),
  );
  const payload: Record<string, unknown> = {
    name: input.name,
    date: input.date,
    holiday_date: input.date,
    is_optional: input.isOptional,
  };
  if (availableCols.has("department_id")) payload["department_id"] = input.departmentId || null;
  if (availableCols.has("team_id")) payload["team_id"] = input.teamId || null;
  if (availableCols.has("role")) payload["role"] = input.role || null;
  if (availableCols.has("user_role")) payload["user_role"] = input.role || null;

  const { data, error } = await supabaseAdmin
    .from("holidays")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ApiError(
        ERROR_CODES.ALREADY_EXISTS,
        "Holiday already exists for this date",
      );
    }
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return data;
}

/**
 * Delete holiday (admin only)
 */
export async function deleteHoliday(holidayId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("holidays")
    .delete()
    .eq("id", holidayId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

import { supabaseAdmin } from "../../../config/supabase.js";

import { ApiError } from "../../../utils/responses.js";

import { ERROR_CODES } from "../../../utils/error-codes.js";

import { getCurrentTimestamp } from "../../../utils/helpers.js";

import type { AttendanceRulesInput } from "./attendance.validator.js";

/**
 * Get attendance rules
 * Returns all shift rules or specific shift rule if shiftType provided
 */
export async function getAttendanceRules(shiftType?: string) {
  let query = supabaseAdmin.from("attendance_rules").select("*");

  if (shiftType) {
    query = query.eq("shift_type", shiftType);
  }

  const { data, error } = await query;

  if (error) {
    return null;
  }

  // If shiftType specified, return single rule, otherwise return all
  if (shiftType && data && data.length > 0) {
    return data[0];
  }

  return data || [];
}

/**
 * Update attendance rules (admin only)
 */
export async function updateAttendanceRules(input: AttendanceRulesInput) {
  const { data: existing } = await supabaseAdmin
    .from("attendance_rules")
    .select("id")
    .single();

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("attendance_rules")
      .update({
        work_start_time: input.workStartTime,
        work_end_time: input.workEndTime,
        late_threshold_minutes: input.lateThresholdMinutes,
        half_day_hours: input.halfDayHours,
        full_day_hours: input.fullDayHours,
        weekly_off_days: input.weeklyOffDays,
        updated_at: getCurrentTimestamp(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("attendance_rules")
      .insert({
        work_start_time: input.workStartTime,
        work_end_time: input.workEndTime,
        late_threshold_minutes: input.lateThresholdMinutes,
        half_day_hours: input.halfDayHours,
        full_day_hours: input.fullDayHours,
        weekly_off_days: input.weeklyOffDays,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    return data;
  }
}

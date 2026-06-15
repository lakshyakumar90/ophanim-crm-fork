import { supabaseAdmin } from "../../../config/supabase.js";

import { ApiError } from "../../../utils/responses.js";

import { ERROR_CODES } from "../../../utils/error-codes.js";

/**
 * Auto-logout users who forgot to clock out at the end of their shift
 * Called by cron job every 5 minutes
 */
export async function bulkAutoLogoutDueSessions(): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc(
    "bulk_auto_logout_due_attendance",
  );

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (typeof data === "number") {
    return data;
  }

  return 0;
}

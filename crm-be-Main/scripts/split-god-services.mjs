/**
 * Splits god-service files into capability-based sub-services + barrel re-exports.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "src", "modules");

function sliceLines(content, startLine, endLine) {
  const lines = content.split("\n");
  return lines.slice(startLine - 1, endLine).join("\n");
}

function writeFile(filePath, parts) {
  const body = parts.filter(Boolean).join("\n\n");
  fs.writeFileSync(filePath, body + "\n", "utf8");
  const lineCount = body.split("\n").length;
  console.log(`  wrote ${path.relative(path.join(__dirname, ".."), filePath)} (${lineCount} lines)`);
}

function exportPrivateHelpers(code) {
  return code
    .replace(/^const IST_TIMEZONE/gm, "export const IST_TIMEZONE")
    .replace(/^const AUTO_MERGE_WINDOW_MINUTES/gm, "export const AUTO_MERGE_WINDOW_MINUTES")
    .replace(/^const AUTO_LOGOUT_GRACE_MINUTES/gm, "export const AUTO_LOGOUT_GRACE_MINUTES")
    .replace(/^const DEFAULT_SHIFT_DURATION_MINUTES/gm, "export const DEFAULT_SHIFT_DURATION_MINUTES")
    .replace(/^const DASHBOARD_LEAD_ANALYTICS_BATCH_SIZE/gm, "export const DASHBOARD_LEAD_ANALYTICS_BATCH_SIZE")
    .replace(/^async function /gm, "export async function ")
    .replace(/^function /gm, "export function ")
    .replace(/^type /gm, "export type ")
    .replace(/^interface /gm, "export interface ");
}

// --- Attendance ---
function splitAttendance() {
  const dir = path.join(root, "operations", "attendance");
  const src = fs.readFileSync(path.join(dir, "attendance.service.ts"), "utf8");
  const importBlock = sliceLines(src, 1, 24);

  writeFile(path.join(dir, "attendance.shared.ts"), [
    importBlock,
    exportPrivateHelpers(sliceLines(src, 26, 770)),
  ]);

  const sharedImport = `import {
  normalizeAttendanceStatus,
  toCompatAttendanceStatus,
  calculateWorkedHours,
  mapAttendanceRowToRecord,
  getShiftDateTimes,
  evaluateClockInWindow,
  calculateAutoLogoutTime,
  calculateScheduledAutoLogoutTime,
  getUserShiftType,
  getAttendanceRulesForShift,
  getEffectiveAttendanceDate,
  deriveSessionStatusByHours,
  getLatestOpenSession,
  closeMalformedOpenSessions,
  closeDueOpenSessions,
  getTodaySessions,
  calculateDayTotalHours,
  normalizeWeeklyOffDays,
  isHolidayApplicableToUser,
  deriveAttendanceDaysForUsers,
  IST_TIMEZONE,
  AUTO_MERGE_WINDOW_MINUTES,
  type AttendanceRecord,
  type AttendanceRow,
  type TodayAttendanceResponse,
  type DerivedDayAttendance,
} from "./attendance.shared.js";`;

  writeFile(path.join(dir, "attendance-clock.service.ts"), [
    importBlock,
    `import { formatInTimeZone } from "date-fns-tz";`,
    `import { SHIFT_TYPES } from "../../../config/constants.js";`,
    `import { getTimestampIST } from "../../../utils/date-utils.js";`,
    sharedImport,
    sliceLines(src, 772, 1221),
  ]);

  writeFile(path.join(dir, "attendance-reports.service.ts"), [
    importBlock,
    `import { formatInTimeZone } from "date-fns-tz";`,
    `import { USER_ROLES, SHIFT_TYPES } from "../../../config/constants.js";`,
    `import { getTimestampIST } from "../../../utils/date-utils.js";`,
    sharedImport,
    sliceLines(src, 1223, 1528),
    sliceLines(src, 1687, 2295),
  ]);

  writeFile(path.join(dir, "attendance-rules.service.ts"), [
    `import { supabaseAdmin } from "../../../config/supabase.js";`,
    `import { ApiError } from "../../../utils/responses.js";`,
    `import { ERROR_CODES } from "../../../utils/error-codes.js";`,
    `import { getCurrentTimestamp } from "../../../utils/helpers.js";`,
    `import type { AttendanceRulesInput } from "./attendance.validator.js";`,
    sliceLines(src, 1530, 1605),
  ]);

  writeFile(path.join(dir, "attendance-holidays.service.ts"), [
    `import { supabaseAdmin } from "../../../config/supabase.js";`,
    `import { ApiError } from "../../../utils/responses.js";`,
    `import { ERROR_CODES } from "../../../utils/error-codes.js";`,
    `import type { CreateHolidayInput } from "./attendance.validator.js";`,
    sliceLines(src, 1607, 1685),
  ]);

  writeFile(path.join(dir, "attendance-auto-logout.service.ts"), [
    `import { supabaseAdmin } from "../../../config/supabase.js";`,
    `import { ApiError } from "../../../utils/responses.js";`,
    `import { ERROR_CODES } from "../../../utils/error-codes.js";`,
    sliceLines(src, 2297, 2315),
  ]);

  writeFile(path.join(dir, "attendance.service.ts"), [
    `export { clockIn, clockOut, getMyTodayAttendance, getMyShiftStatus } from "./attendance-clock.service.js";`,
    `export { getAttendanceRules, updateAttendanceRules } from "./attendance-rules.service.js";`,
    `export { getHolidays, createHoliday, deleteHoliday } from "./attendance-holidays.service.js";`,
    `export {
  getAttendanceList,
  createManualAttendance,
  updateAttendance,
  getAttendanceSummary,
  getAttendanceAnalytics,
  getAllUsersAttendance,
  getUserAttendanceHistory,
  restoreAttendanceByAdmin,
  getWeeklyHours,
} from "./attendance-reports.service.js";`,
    `export { bulkAutoLogoutDueSessions } from "./attendance-auto-logout.service.js";`,
  ]);
}

// --- Leads ---
function splitLeads() {
  const dir = path.join(root, "sales", "leads");
  const src = fs.readFileSync(path.join(dir, "leads.service.ts"), "utf8");
  const importBlock = sliceLines(src, 1, 36);

  writeFile(path.join(dir, "leads.shared.ts"), [
    exportPrivateHelpers(sliceLines(src, 38, 228)),
  ]);

  const sharedImport = `import {
  mapLeadRowToRecord,
  invalidateLeadDetailPageCache,
  LEAD_DETAIL_SELECT,
  LEAD_ACTIVITY_SELECT,
  LEAD_COMMENT_SELECT,
  LEAD_REMINDER_SELECT,
  type LeadRecord,
  type LeadRow,
} from "./leads.shared.js";`;
  const crudImport = `import { getLeadById } from "./leads-crud.service.js";`;

  writeFile(path.join(dir, "leads-crud.service.ts"), [
    importBlock,
    `import type { CreateLeadInput, UpdateLeadInput, LeadListQuery } from "./leads.validator.js";`,
    sharedImport,
    sliceLines(src, 230, 675),
    sliceLines(src, 887, 901),
  ]);

  writeFile(path.join(dir, "leads-pipeline.service.ts"), [
    importBlock,
    `import type { AssignLeadInput } from "./leads.validator.js";`,
    sharedImport,
    sliceLines(src, 676, 777),
    sliceLines(src, 927, 1197),
  ]);

  writeFile(path.join(dir, "leads-bulk.service.ts"), [
    importBlock,
    `import type { BulkAssignInput, BulkUpdateLeadsInput, BulkDeleteInput } from "./leads.validator.js";`,
    sharedImport,
    crudImport,
    sliceLines(src, 779, 885),
    sliceLines(src, 903, 925),
  ]);

  writeFile(path.join(dir, "leads-activities.service.ts"), [
    importBlock,
    `import type { CreateActivityInput, ChangeStatusInput } from "./leads.validator.js";`,
    sharedImport,
    crudImport,
    sliceLines(src, 1199, 1389),
  ]);

  writeFile(path.join(dir, "leads-comments.service.ts"), [
    importBlock,
    `import type { CreateCommentInput, UpdateCommentInput } from "./leads.validator.js";`,
    sharedImport,
    crudImport,
    sliceLines(src, 1391, 1601),
  ]);

  writeFile(path.join(dir, "leads-reminders.service.ts"), [
    importBlock,
    sharedImport,
    sliceLines(src, 1603, 2031),
  ]);

  writeFile(path.join(dir, "leads.service.ts"), [
    `export { getLeads, getLeadById, getLeadDetailPageData, createLead, updateLead, deleteLead } from "./leads-crud.service.js";`,
    `export { assignLead, getLeadPipeline, getLeadCountsByUser, getWonLeads } from "./leads-pipeline.service.js";`,
    `export { bulkAssignLeads, bulkUpdateLeads, bulkDeleteLeads } from "./leads-bulk.service.js";`,
    `export { addLeadActivity, getLeadActivities, updateLeadStatus } from "./leads-activities.service.js";`,
    `export { getLeadComments, addLeadComment, updateLeadComment, deleteLeadComment } from "./leads-comments.service.js";`,
    `export {
  getLeadReminders,
  createLeadReminder,
  deleteLeadReminder,
  getUserPendingReminders,
  getAllReminders,
  getRemindersCount,
  markReminderDone,
} from "./leads-reminders.service.js";`,
  ]);
}

// --- Dashboard ---
function splitDashboard() {
  const dir = path.join(root, "operations", "dashboard");
  const src = fs.readFileSync(path.join(dir, "dashboard.service.ts"), "utf8");
  const importBlock = sliceLines(src, 1, 17);

  writeFile(path.join(dir, "dashboard.shared.ts"), [
    importBlock,
    exportPrivateHelpers(sliceLines(src, 19, 81)),
    exportPrivateHelpers(sliceLines(src, 617, 820)),
  ]);

  const sharedImport = `import {
  tryGetDashboardStatsRPC,
  tryGetLeadAggregationsRPC,
  fetchLeadIdsWithActivities,
  fetchLeadAnalyticsRowsByIds,
  fetchLeadAnalyticsRows,
  getScopedUserIds,
  type LeadAnalyticsRow,
  type LeadAnalyticsFilters,
  type UserWiseAnalyticsFilters,
} from "./dashboard.shared.js";`;

  writeFile(path.join(dir, "dashboard-admin.service.ts"), [
    importBlock,
    sharedImport,
    sliceLines(src, 83, 341),
    sliceLines(src, 1655, 1713),
  ]);

  writeFile(path.join(dir, "dashboard-manager.service.ts"), [
    importBlock,
    sharedImport,
    sliceLines(src, 343, 612),
  ]);

  writeFile(path.join(dir, "dashboard-lead-analytics.service.ts"), [
    importBlock,
    sharedImport,
    sliceLines(src, 744, 1326),
  ]);

  writeFile(path.join(dir, "dashboard-revenue.service.ts"), [
    importBlock,
    sharedImport,
    sliceLines(src, 1328, 1653),
  ]);

  writeFile(path.join(dir, "dashboard.service.ts"), [
    `export { getAdminDashboard, getEnhancedAdminDashboard } from "./dashboard-admin.service.js";`,
    `export { getManagerDashboard, getEmployeeDashboard } from "./dashboard-manager.service.js";`,
    `export {
  getLeadAnalytics,
  getLeadAnalyticsScoped,
  getUserWiseAnalytics,
  getUserPerformance,
  getHighPriorityAlerts,
  getLeadTrendData,
} from "./dashboard-lead-analytics.service.js";`,
    `export {
  getRevenueTrendData,
  getProjectStatusData,
  getDepartmentPerformance,
  getTopPerformers,
} from "./dashboard-revenue.service.js";`,
  ]);
}

// --- Auth ---
function splitAuth() {
  const dir = path.join(root, "auth", "auth");
  const src = fs.readFileSync(path.join(dir, "auth.service.ts"), "utf8");
  const importBlock = sliceLines(src, 1, 36);

  writeFile(path.join(dir, "auth.shared.ts"), [
    importBlock,
    exportPrivateHelpers(sliceLines(src, 38, 145)),
  ]);

  const sharedImport = `import {
  hasEmployeeProfilesSalaryBandColumn,
  getAuthVerifyClient,
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpiresIn,
} from "./auth.shared.js";`;

  writeFile(path.join(dir, "auth-session.service.ts"), [
    importBlock,
    sharedImport,
    `import type { LoginInput, RefreshTokenInput } from "./auth.validator.js";`,
    sliceLines(src, 147, 254),
    sliceLines(src, 441, 578),
    sliceLines(src, 746, 872),
  ]);

  writeFile(path.join(dir, "auth-registration.service.ts"), [
    importBlock,
    sharedImport,
    `import type { RegisterInput } from "./auth.validator.js";`,
    sliceLines(src, 256, 439),
  ]);

  writeFile(path.join(dir, "auth-password.service.ts"), [
    importBlock,
    sharedImport,
    `import type { ChangePasswordInput } from "./auth.validator.js";`,
    sliceLines(src, 580, 744),
  ]);

  writeFile(path.join(dir, "auth-2fa.service.ts"), [
    importBlock,
    sharedImport,
    sliceLines(src, 874, 1072),
  ]);

  writeFile(path.join(dir, "auth.service.ts"), [
    `export { login, refreshAccessToken, logout, getCurrentUser, cleanupExpiredTokens } from "./auth-session.service.js";`,
    `export { register } from "./auth-registration.service.js";`,
    `export {
  changePassword,
  adminResetPassword,
  requestPasswordChangeOTP,
  verifyOTPAndChangePassword,
} from "./auth-password.service.js";`,
    `export { setup2FA, verify2FASetup, disable2FA, login2FA } from "./auth-2fa.service.js";`,
  ]);
}

console.log("Splitting attendance...");
splitAttendance();
console.log("Splitting leads...");
splitLeads();
console.log("Splitting dashboard...");
splitDashboard();
console.log("Splitting auth...");
splitAuth();
console.log("Done.");

import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  requireAdmin,
  requireManager,
  requireHRAccess,
  requireManagerOrHRAccess,
} from "../middleware/authorization.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  clockInSchema,
  clockOutSchema,
  manualAttendanceSchema,
  updateAttendanceSchema,
  attendanceListQuerySchema,
  attendanceSummaryQuerySchema,
  attendanceAnalyticsQuerySchema,
  attendanceUsersTodayQuerySchema,
  attendanceUserHistoryParamsSchema,
  attendanceUserHistoryQuerySchema,
  attendanceHolidaysQuerySchema,
  attendanceLeavesQuerySchema,
  attendanceWeeklyHoursQuerySchema,
  attendanceRulesSchema,
  createHolidaySchema,
} from "../validators/attendance.validator.js";
import { uuidParamSchema } from "../validators/users.validator.js";
import * as attendanceService from "../services/attendance.service.js";
import * as leaveService from "../services/leave.service.js";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
  ApiError,
} from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";
import {
  getTodayIST,
  getMonthIST,
  getYearIST,
  nowIST,
} from "../utils/date-utils.js";

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * POST /attendance/clock-in
 * Clock in for the day
 */
router.post(
  "/clock-in",
  validateBody(clockInSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const body = req.body as {
      userId?: string;
      location?: string | null;
      notes?: string | null;
    };

    if (body.userId && body.userId !== authReq.user.id) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only clock in for your own account",
      );
    }

    const record = await attendanceService.clockIn(authReq.user.id, {
      location: body.location,
      notes: body.notes,
    });
    const today = await attendanceService.getMyTodayAttendance(authReq.user.id);

    sendCreated(res, {
      id: record.id,
      userId: record.userId,
      clockInTime: record.clockInTime,
      status: record.status === "late" ? "Late" : "On-time",
      attendanceStatus: record.status,
      date: record.date,
      session: record,
      today: today?.today || {
        totalHours: record.totalHours || 0,
        sessionsCount: 1,
      },
    });
  }),
);

/**
 * POST /attendance/clock-out
 * Clock out for the day
 */
router.post(
  "/clock-out",
  validateBody(clockOutSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const session = await attendanceService.clockOut(authReq.user.id, req.body);
    const today = await attendanceService.getMyTodayAttendance(authReq.user.id);
    sendSuccess(res, {
      ...session,
      session,
      today: today?.today || {
        totalHours: session.totalHours || 0,
        sessionsCount: 0,
      },
    });
  }),
);

/**
 * GET /attendance/today
 * Get today's attendance for current user
 */
router.get(
  "/today",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const record = await attendanceService.getMyTodayAttendance(
      authReq.user.id,
    );
    sendSuccess(res, record);
  }),
);

/**
 * GET /attendance/shift-status
 * Get remaining shift time and current session status
 */
router.get(
  "/shift-status",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const status = await attendanceService.getMyShiftStatus(authReq.user.id);
    sendSuccess(res, status);
  }),
);

/**
 * GET /attendance/summary
 * Get attendance summary for current user
 */
router.get(
  "/summary",
  validateQuery(attendanceSummaryQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const month = (req.query["month"] as number | undefined) || getMonthIST();
    const year = (req.query["year"] as number | undefined) || getYearIST();
    const summary = await attendanceService.getAttendanceSummary(
      authReq.user.id,
      month,
      year,
    );
    sendSuccess(res, summary);
  }),
);

/**
 * GET /attendance/analytics
 * Get attendance analytics for dashboard (admin and manager)
 */
router.get(
  "/analytics",
  requireManagerOrHRAccess() as any,
  validateQuery(attendanceAnalyticsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const startDate = (req.query["startDate"] as string) || getTodayIST();
    const endDate = (req.query["endDate"] as string) || getTodayIST();

    // Managers can only see their department's analytics
    let departmentId = req.query["departmentId"] as string | undefined;
    if (authReq.user.role === "manager" && authReq.user.departmentId) {
      departmentId = authReq.user.departmentId;
    }

    const analytics = await attendanceService.getAttendanceAnalytics(
      startDate,
      endDate,
      departmentId,
    );
    sendSuccess(res, analytics);
  }),
);

/**
 * GET /attendance/users-today
 * Get all users attendance for a specific date (admin only)
 */
router.get(
  "/users-today",
  requireManagerOrHRAccess() as any,
  validateQuery(attendanceUsersTodayQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const date = (req.query["date"] as string) || getTodayIST();
    const departmentId = req.query["departmentId"] as string | undefined;

    const usersAttendance = await attendanceService.getAllUsersAttendance(
      date,
      departmentId,
    );
    sendSuccess(res, usersAttendance);
  }),
);

/**
 * GET /attendance/user/:userId/history
 * Get user attendance history (admin/manager only)
 * Managers can only view their team members' history
 */
router.get(
  "/user/:userId/history",
  requireManagerOrHRAccess() as any,
  validateParams(attendanceUserHistoryParamsSchema),
  validateQuery(attendanceUserHistoryQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = req.params["userId"] as string;

    // Managers can only view their own team members' history
    if (authReq.user.role === "manager" && authReq.user.teamId) {
      const { data: targetUser } = await (
        await import("../config/supabase.js")
      ).supabaseAdmin
        .from("users")
        .select("team_id")
        .eq("id", userId)
        .single();

      if (
        targetUser?.team_id !== authReq.user.teamId &&
        userId !== authReq.user.id
      ) {
        throw new (await import("../utils/responses.js")).ApiError(
          (await import("../utils/error-codes.js")).ERROR_CODES.FORBIDDEN,
          "You can only view attendance history for your team members",
        );
      }
    }

    // Default start date is 30 days ago
    const thirtyDaysAgo = nowIST();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startDate =
      (req.query["startDate"] as string) ||
      thirtyDaysAgo.toISOString().split("T")[0]!;

    const endDate = (req.query["endDate"] as string) || getTodayIST();
    const history = await attendanceService.getUserAttendanceHistory(
      userId,
      startDate,
      endDate,
    );
    sendSuccess(res, history);
  }),
);

/**
 * GET /attendance
 * Get paginated list of attendance records
 */
router.get(
  "/",
  requireManager as any,
  validateQuery(attendanceListQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await attendanceService.getAttendanceList(
      req.query as any,
      authReq.user,
    );
    sendPaginated(res, result.data, result.meta);
  }),
);

/**
 * POST /attendance/manual
 * Create manual attendance record (admin only)
 */
router.post(
  "/manual",
  requireAdmin as any,
  validateBody(manualAttendanceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const record = await attendanceService.createManualAttendance(req.body);
    sendCreated(res, record);
  }),
);

/**
 * PUT /attendance/:id
 * Update attendance record (admin only)
 */
router.put(
  "/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(updateAttendanceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const record = await attendanceService.updateAttendance(
      req.params["id"] as string,
      req.body,
    );
    sendSuccess(res, record);
  }),
);

/**
 * GET /attendance/rules
 * Get attendance rules
 */
router.get(
  "/rules",
  asyncHandler(async (_req: Request, res: Response) => {
    const rules = await attendanceService.getAttendanceRules();
    sendSuccess(res, rules);
  }),
);

/**
 * PUT /attendance/rules
 * Update attendance rules (admin only)
 */
router.put(
  "/rules",
  requireAdmin as any,
  validateBody(attendanceRulesSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const rules = await attendanceService.updateAttendanceRules(req.body);
    sendSuccess(res, rules);
  }),
);

/**
 * GET /attendance/holidays
 * Get holidays list
 */
router.get(
  "/holidays",
  validateQuery(attendanceHolidaysQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const year = req.query["year"] as number | undefined;
    const holidays = await attendanceService.getHolidays(year);
    sendSuccess(res, holidays);
  }),
);

/**
 * GET /attendance/leaves
 * Get approved leaves for calendar with role-based visibility
 */
router.get(
  "/leaves",
  validateQuery(attendanceLeavesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const leaves = await leaveService.getApprovedLeavesForCalendar(
      {
        startDate: req.query["startDate"] as string | undefined,
        endDate: req.query["endDate"] as string | undefined,
      },
      authReq.user,
    );
    sendSuccess(res, leaves);
  }),
);

/**
 * POST /attendance/holidays
 * Create holiday (admin only)
 */
router.post(
  "/holidays",
  requireHRAccess() as any,
  validateBody(createHolidaySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const holiday = await attendanceService.createHoliday(req.body);
    sendCreated(res, holiday);
  }),
);

/**
 * DELETE /attendance/holidays/:id
 * Delete holiday (admin only)
 */
router.delete(
  "/holidays/:id",
  requireHRAccess() as any,
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await attendanceService.deleteHoliday(req.params["id"] as string);
    sendNoContent(res);
  }),
);

/**
 * POST /attendance/admin/restore/:id
 * Restore a completed attendance session to ACTIVE (admin only)
 */
router.post(
  "/admin/restore/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const attendanceId = req.params["id"] as string;
    const record = await attendanceService.restoreAttendanceByAdmin(
      attendanceId,
      authReq.user.id,
    );
    sendSuccess(res, record);
  }),
);

/**
 * GET /attendance/weekly-hours
 * Get weekly hours for a user (all users can access their own, admin can access any)
 */
router.get(
  "/weekly-hours",
  validateQuery(attendanceWeeklyHoursQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const isAdmin = authReq.user.role === "admin";

    // If userId is provided and user is admin, use that; otherwise use current user
    let targetUserId = authReq.user.id;
    if (req.query["userId"] && isAdmin) {
      targetUserId = req.query["userId"] as string;
    }

    // Get the week start date (Monday) - default to current week
    let weekStart = req.query["weekStart"] as string;
    if (!weekStart) {
      // Calculate current week's Monday
      const today = nowIST();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      weekStart = monday.toISOString().split("T")[0]!;
    }

    const weeklyHours = await attendanceService.getWeeklyHours(
      targetUserId,
      weekStart,
    );
    sendSuccess(res, weeklyHours);
  }),
);

export default router;

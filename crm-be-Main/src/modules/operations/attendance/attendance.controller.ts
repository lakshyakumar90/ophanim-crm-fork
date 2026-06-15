import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
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
} from "./attendance.validator.js";
import { uuidParamSchema } from "../../core/users/users.validator.js";
import * as attendanceService from "./attendance.service.js";
import * as leaveService from "../../hr/leave/leave.service.js";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
  ApiError,
} from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import {
  getTodayIST,
  getMonthIST,
  getYearIST,
  nowIST,
} from "../../../utils/date-utils.js";

export const clockIn = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const body = req.body as {
      userId?: string;
      location?: string | null;
      notes?: string | null;
    };

    if (body.userId && body.userId !== req.user.id) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only clock in for your own account",
      );
    }

    const record = await attendanceService.clockIn(req.user.id, {
      location: body.location,
      notes: body.notes,
    });
    const today = await attendanceService.getMyTodayAttendance(req.user.id);

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
  } catch (error) {
    next(error);
  }
};

export const clockOut = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const session = await attendanceService.clockOut(req.user.id, req.body);
    const today = await attendanceService.getMyTodayAttendance(req.user.id);
    sendSuccess(res, {
      ...session,
      session,
      today: today?.today || {
        totalHours: session.totalHours || 0,
        sessionsCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getToday = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const record = await attendanceService.getMyTodayAttendance(
      req.user.id,
    );
    sendSuccess(res, record);
  } catch (error) {
    next(error);
  }
};

export const getShiftStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const status = await attendanceService.getMyShiftStatus(req.user.id);
    sendSuccess(res, status);
  } catch (error) {
    next(error);
  }
};

export const getSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const month = (req.query["month"] as number | undefined) || getMonthIST();
    const year = (req.query["year"] as number | undefined) || getYearIST();
    const summary = await attendanceService.getAttendanceSummary(
      req.user.id,
      month,
      year,
    );
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const startDate = (req.query["startDate"] as string) || getTodayIST();
    const endDate = (req.query["endDate"] as string) || getTodayIST();

    // Managers can only see their department's analytics
    let departmentId = req.query["departmentId"] as string | undefined;
    if (req.user.role === "manager" && req.user.departmentId) {
      departmentId = req.user.departmentId;
    }

    const analytics = await attendanceService.getAttendanceAnalytics(
      startDate,
      endDate,
      departmentId,
    );
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};

export const getUsersToday = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const date = (req.query["date"] as string) || getTodayIST();
    const departmentId = req.query["departmentId"] as string | undefined;

    const usersAttendance = await attendanceService.getAllUsersAttendance(
      date,
      departmentId,
    );
    sendSuccess(res, usersAttendance);
  } catch (error) {
    next(error);
  }
};

export const getUserHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const userId = req.params["userId"] as string;

    // Managers can only view their own team members' history
    if (req.user.role === "manager" && req.user.teamId) {
      const { data: targetUser } = await (
        await import("../../../config/supabase.js")
      ).supabaseAdmin
        .from("users")
        .select("team_id")
        .eq("id", userId)
        .single();

      if (
        targetUser?.team_id !== req.user.teamId &&
        userId !== req.user.id
      ) {
        throw new (await import("../../../utils/responses.js")).ApiError(
          (await import("../../../utils/error-codes.js")).ERROR_CODES.FORBIDDEN,
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
  } catch (error) {
    next(error);
  }
};

export const listAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const result = await attendanceService.getAttendanceList(
      req.query as any,
      req.user,
    );
    sendPaginated(res, result.data, result.meta);
  } catch (error) {
    next(error);
  }
};

export const createManualAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const record = await attendanceService.createManualAttendance(req.body);
    sendCreated(res, record);
  } catch (error) {
    next(error);
  }
};

export const updateAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const record = await attendanceService.updateAttendance(
      req.params["id"] as string,
      req.body,
    );
    sendSuccess(res, record);
  } catch (error) {
    next(error);
  }
};

export const getRules = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const rules = await attendanceService.getAttendanceRules();
    sendSuccess(res, rules);
  } catch (error) {
    next(error);
  }
};

export const updateRules = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const rules = await attendanceService.updateAttendanceRules(req.body);
    sendSuccess(res, rules);
  } catch (error) {
    next(error);
  }
};

export const getHolidays = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const year = req.query["year"] as number | undefined;
    const holidays = await attendanceService.getHolidays(year);
    sendSuccess(res, holidays);
  } catch (error) {
    next(error);
  }
};

export const getLeaves = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const leaves = await leaveService.getApprovedLeavesForCalendar(
      {
        startDate: req.query["startDate"] as string | undefined,
        endDate: req.query["endDate"] as string | undefined,
      },
      req.user,
    );
    sendSuccess(res, leaves);
  } catch (error) {
    next(error);
  }
};

export const createHoliday = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const holiday = await attendanceService.createHoliday(req.body);
    sendCreated(res, holiday);
  } catch (error) {
    next(error);
  }
};

export const deleteHoliday = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    await attendanceService.deleteHoliday(req.params["id"] as string);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const restoreAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const attendanceId = req.params["id"] as string;
    const record = await attendanceService.restoreAttendanceByAdmin(
      attendanceId,
      req.user.id,
    );
    sendSuccess(res, record);
  } catch (error) {
    next(error);
  }
};

export const getWeeklyHours = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const isAdmin = req.user.role === "admin";

    // If userId is provided and user is admin, use that; otherwise use current user
    let targetUserId = req.user.id;
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
  } catch (error) {
    next(error);
  }
};


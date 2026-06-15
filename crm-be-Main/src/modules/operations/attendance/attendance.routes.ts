import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requireAdmin,
  requireManager,
  requireHRAccess,
  requireManagerOrHRAccess,
} from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
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
import * as attendanceController from "./attendance.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.post(
  "/clock-in",
  validateBody(clockInSchema),
  asyncHandler(attendanceController.clockIn) as RequestHandler,
);

router.post(
  "/clock-out",
  validateBody(clockOutSchema),
  asyncHandler(attendanceController.clockOut) as RequestHandler,
);

router.get("/today", asyncHandler(attendanceController.getToday) as RequestHandler);

router.get(
  "/shift-status",
  asyncHandler(attendanceController.getShiftStatus) as RequestHandler,
);

router.get(
  "/summary",
  validateQuery(attendanceSummaryQuerySchema),
  asyncHandler(attendanceController.getSummary) as RequestHandler,
);

router.get(
  "/analytics",
  requireManagerOrHRAccess() as any,
  validateQuery(attendanceAnalyticsQuerySchema),
  asyncHandler(attendanceController.getAnalytics) as RequestHandler,
);

router.get(
  "/users-today",
  requireManagerOrHRAccess() as any,
  validateQuery(attendanceUsersTodayQuerySchema),
  asyncHandler(attendanceController.getUsersToday) as RequestHandler,
);

router.get(
  "/user/:userId/history",
  requireManagerOrHRAccess() as any,
  validateParams(attendanceUserHistoryParamsSchema),
  validateQuery(attendanceUserHistoryQuerySchema),
  asyncHandler(attendanceController.getUserHistory) as RequestHandler,
);

router.get(
  "/",
  requireManager as any,
  validateQuery(attendanceListQuerySchema),
  asyncHandler(attendanceController.listAttendance) as RequestHandler,
);

router.post(
  "/manual",
  requireAdmin as any,
  validateBody(manualAttendanceSchema),
  asyncHandler(attendanceController.createManualAttendance) as RequestHandler,
);

router.put(
  "/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(updateAttendanceSchema),
  asyncHandler(attendanceController.updateAttendance) as RequestHandler,
);

router.get("/rules", asyncHandler(attendanceController.getRules) as RequestHandler);

router.put(
  "/rules",
  requireAdmin as any,
  validateBody(attendanceRulesSchema),
  asyncHandler(attendanceController.updateRules) as RequestHandler,
);

router.get(
  "/holidays",
  validateQuery(attendanceHolidaysQuerySchema),
  asyncHandler(attendanceController.getHolidays) as RequestHandler,
);

router.get(
  "/leaves",
  validateQuery(attendanceLeavesQuerySchema),
  asyncHandler(attendanceController.getLeaves) as RequestHandler,
);

router.post(
  "/holidays",
  requireHRAccess() as any,
  validateBody(createHolidaySchema),
  asyncHandler(attendanceController.createHoliday) as RequestHandler,
);

router.delete(
  "/holidays/:id",
  requireHRAccess() as any,
  validateParams(uuidParamSchema),
  asyncHandler(attendanceController.deleteHoliday) as RequestHandler,
);

router.post(
  "/admin/restore/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  asyncHandler(attendanceController.restoreAttendance) as RequestHandler,
);

router.get(
  "/weekly-hours",
  validateQuery(attendanceWeeklyHoursQuerySchema),
  asyncHandler(attendanceController.getWeeklyHours) as RequestHandler,
);

export default router;

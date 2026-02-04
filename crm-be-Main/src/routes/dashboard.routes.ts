import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  requireAdmin,
  requireManager,
} from "../middleware/authorization.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import * as dashboardService from "../services/dashboard.service.js";
import {
  getCached,
  buildCacheKey,
  CACHE_KEYS,
  CACHE_TTL,
} from "../services/cache.service.js";
import { sendSuccess } from "../utils/responses.js";
import { USER_ROLES } from "../config/constants.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";
import { nowIST, getStartOfMonthIST } from "../utils/date-utils.js";

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /dashboard
 * Get dashboard based on user role
 * OPTIMIZED: Uses caching for faster response times
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const departmentId = req.query.departmentId as string | undefined;

    let data;

    if (authReq.user.role === USER_ROLES.ADMIN) {
      // Cache admin dashboard by department
      const cacheKey = buildCacheKey(
        CACHE_KEYS.DASHBOARD_ADMIN,
        departmentId || "all",
      );
      data = await getCached(
        cacheKey,
        () => dashboardService.getAdminDashboard(departmentId),
        CACHE_TTL.DASHBOARD,
      );
    } else if (authReq.user.role === USER_ROLES.MANAGER) {
      // Cache manager dashboard by user
      const cacheKey = buildCacheKey(
        CACHE_KEYS.DASHBOARD_MANAGER,
        authReq.user.id,
      );
      data = await getCached(
        cacheKey,
        () => dashboardService.getManagerDashboard(authReq.user),
        CACHE_TTL.DASHBOARD,
      );
    } else {
      // Cache employee dashboard by user
      const cacheKey = buildCacheKey(
        CACHE_KEYS.DASHBOARD_EMPLOYEE,
        authReq.user.id,
      );
      data = await getCached(
        cacheKey,
        () => dashboardService.getEmployeeDashboard(authReq.user.id),
        CACHE_TTL.DASHBOARD,
      );
    }

    sendSuccess(res, data);
  }),
);

/**
 * GET /dashboard/admin
 * Get admin dashboard (admin only)
 */
router.get(
  "/admin",
  requireAdmin as any,
  asyncHandler(async (req: Request, res: Response) => {
    const departmentId = req.query.departmentId as string | undefined;
    const cacheKey = buildCacheKey(
      CACHE_KEYS.DASHBOARD_ADMIN,
      departmentId || "all",
    );

    const data = await getCached(
      cacheKey,
      () => dashboardService.getAdminDashboard(departmentId),
      CACHE_TTL.DASHBOARD,
    );
    sendSuccess(res, data);
  }),
);

/**
 * GET /dashboard/lead-analytics
 * Get lead analytics
 */
router.get(
  "/lead-analytics",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const startDate =
      (req.query["startDate"] as string) ||
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = (req.query["endDate"] as string) || now.toISOString();

    // Cache analytics for 5 minutes
    const cacheKey = `analytics:leads:${startDate.slice(0, 10)}:${endDate.slice(0, 10)}`;
    const data = await getCached(
      cacheKey,
      () => dashboardService.getLeadAnalytics(startDate, endDate),
      CACHE_TTL.ANALYTICS,
    );
    sendSuccess(res, data);
  }),
);

/**
 * GET /dashboard/user-performance/:userId
 * Get user performance stats
 */
router.get(
  "/user-performance/:userId",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const now = nowIST();
    const startDate =
      (req.query["startDate"] as string) ||
      getStartOfMonthIST(now.getFullYear(), now.getMonth() + 1);
    const endDate = (req.query["endDate"] as string) || now.toISOString();

    const data = await dashboardService.getUserPerformance(
      req.params["userId"] as string,
      startDate,
      endDate,
    );
    sendSuccess(res, data);
  }),
);

/**
 * GET /dashboard/my-performance
 * Get current user's performance
 */
router.get(
  "/my-performance",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const now = nowIST();
    const startDate =
      (req.query["startDate"] as string) ||
      getStartOfMonthIST(now.getFullYear(), now.getMonth() + 1);
    const endDate = (req.query["endDate"] as string) || now.toISOString();

    const data = await dashboardService.getUserPerformance(
      authReq.user.id,
      startDate,
      endDate,
    );
    sendSuccess(res, data);
  }),
);

/**
 * GET /dashboard/enhanced
 * Get enhanced admin dashboard with charts and alerts (admin only)
 * OPTIMIZED: Uses caching for faster response times
 */
router.get(
  "/enhanced",
  requireAdmin as any,
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await getCached(
      CACHE_KEYS.DASHBOARD_ENHANCED,
      () => dashboardService.getEnhancedAdminDashboard(),
      CACHE_TTL.DASHBOARD,
    );
    sendSuccess(res, data);
  }),
);

export default router;

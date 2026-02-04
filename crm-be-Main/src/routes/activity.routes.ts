import {
  Router,
  type RequestHandler,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import * as activityService from "../services/activity.service.js";
import { sendSuccess, sendPaginated, ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: Router = Router();

/**
 * Get activity logs (admin only)
 * GET /activities
 */
router.get(
  "/",
  authenticate as RequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as unknown as AuthenticatedRequest;
    try {
      // Allow all authenticated users to view activities
      // The service layer handles filtering logic if needed
      if (!authReq.user) {
        throw new ApiError(ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const result = await activityService.getActivityLogs({
        page: req.query.page as string,
        limit: req.query.limit as string,
        userId: req.query.userId as string,
        resourceType: req.query.resourceType as string,
        action: req.query.action as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        departmentId: req.query.departmentId as string,
        teamId: req.query.teamId as string,
        excludeAuthActivity: req.query.includeAuth !== "true", // Default: exclude login/logout
        // Pass auth context for filtering
        authRole: authReq.user.role,
        authUserId: authReq.user.id,
      });

      sendPaginated(res, result.data || [], result.meta);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Get lead activities (for dashboard)
 * GET /activities/leads
 */
router.get(
  "/leads",
  authenticate as RequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await activityService.getLeadActivities({
        page: req.query.page as string,
        limit: req.query.limit as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });

      sendPaginated(res, result.data || [], result.meta);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Get activity statistics (admin only)
 * GET /activities/stats
 */
router.get(
  "/stats",
  authenticate as RequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as unknown as AuthenticatedRequest;
    try {
      // Allow all authenticated users to view stats
      if (!authReq.user) {
        throw new ApiError(ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }
      const departmentId = req.query.departmentId as string;
      const resourceType = req.query.resourceType as string;

      const stats = await activityService.getActivityStats({
        departmentId,
        resourceType,
        authRole: authReq.user.role,
        authUserId: authReq.user.id,
      });
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Get activity analytics (admin only)
 * GET /activities/analytics
 */
router.get(
  "/analytics",
  authenticate as RequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as unknown as AuthenticatedRequest;
    try {
      // Allow admins and managers to view analytics
      if (authReq.user?.role !== "admin" && authReq.user?.role !== "manager") {
        throw new ApiError(
          ERROR_CODES.FORBIDDEN,
          "Admin or Manager access required",
        );
      }

      const result = await activityService.getActivityAnalytics({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        teamId: req.query.teamId as string,
        userId: req.query.userId as string,
        interval: req.query.interval as
          | "daily"
          | "weekly"
          | "monthly"
          | "quarterly",
        departmentId: req.query.departmentId as string,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;

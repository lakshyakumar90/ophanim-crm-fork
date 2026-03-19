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
 * Get activity logs (all authenticated users)
 * GET /activities
 *
 * Supports two modes:
 *   Legacy mode  (default): offset-based pagination from all_activities view
 *   Cursor mode  (?use_events_feed=true): cursor-based pagination from activity_events table
 *
 * Cursor mode params:
 *   use_events_feed=true   – opt-in to cursor pagination
 *   cursor_time            – ISO timestamp cursor from previous page's nextCursor.createdAt
 *   cursor_id              – UUID cursor from previous page's nextCursor.id
 *   event_type             – filter by event_type (optional)
 */
router.get(
  "/",
  authenticate as RequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as unknown as AuthenticatedRequest;
    try {
      if (!authReq.user) {
        throw new ApiError(ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const useEventsFeed = req.query.use_events_feed === "true";

      if (useEventsFeed) {
        const result = await activityService.getActivityEventsFeed({
          limit: req.query.limit ? Number(req.query.limit) : 50,
          cursorTime: req.query.cursor_time as string | undefined,
          cursorId: req.query.cursor_id as string | undefined,
          actorId: req.query.actorId as string | undefined,
          eventType: req.query.event_type as string | undefined,
        });

        sendSuccess(res, {
          data: result.data,
          meta: { nextCursor: result.nextCursor },
        });
        return;
      }

       const result = await activityService.getActivityLogs({
         page: req.query.page as string,
         limit: req.query.limit as string,
         userId: req.query.userId as string,
         resourceType: req.query.resourceType as string,
         entityId: req.query.entityId as string,
         action: req.query.action as string,
         startDate: req.query.startDate as string,
         endDate: req.query.endDate as string,
         departmentId: req.query.departmentId as string,
         teamId: req.query.teamId as string,
         scope: req.query.scope as string,
         commentsOnly: req.query.commentsOnly === "true",
         excludeAuthActivity: req.query.includeAuth === "false",
         authRole: authReq.user.role,
         authUserId: authReq.user.id,
         authTeamId: authReq.user.teamId,
         authDepartmentId: authReq.user.departmentId,
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
 * Get activity statistics
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
      const teamId = req.query.teamId as string;
      const userId = req.query.userId as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const scope = req.query.scope as string;
      const commentsOnly = req.query.commentsOnly === "true";

      const stats = await activityService.getActivityStats({
        departmentId,
        teamId,
        userId,
        resourceType,
        startDate,
        endDate,
        scope,
        commentsOnly,
        authRole: authReq.user.role,
        authUserId: authReq.user.id,
        authTeamId: authReq.user.teamId,
        authDepartmentId: authReq.user.departmentId,
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

import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as activityService from "./activity.service.js";
import { sendSuccess, sendPaginated, ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";

export const getActivityLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
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
      authRole: req.user.role,
      authUserId: req.user.id,
      authTeamId: req.user.teamId,
      authDepartmentId: req.user.departmentId,
    });

    sendPaginated(res, result.data || [], result.meta);
  } catch (error) {
    next(error);
  }
};

export const getLeadActivities = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
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
};

export const getActivityStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
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
      authRole: req.user.role,
      authUserId: req.user.id,
      authTeamId: req.user.teamId,
      authDepartmentId: req.user.departmentId,
    });
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

export const getActivityAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new ApiError(ERROR_CODES.UNAUTHORIZED, "Authentication required");
    }

    const result = await activityService.getActivityAnalytics({
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      teamId:
        req.user.role === "admin"
          ? (req.query.teamId as string)
          : req.user.role === "manager"
            ? req.user.teamId || undefined
            : undefined,
      userId:
        req.user.role === "admin"
          ? (req.query.userId as string)
          : req.user.role === "manager"
            ? (req.query.userId as string)
            : req.user.id,
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
};

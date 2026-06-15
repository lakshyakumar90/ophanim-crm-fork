import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as dashboardService from "./dashboard.service.js";
import {
  getCached,
  buildCacheKey,
  CACHE_KEYS,
  CACHE_TTL,
} from "../../shared/cache.service.js";
import { sendSuccess } from "../../../utils/responses.js";
import { USER_ROLES } from "../../../config/constants.js";
import { nowIST, getStartOfMonthIST } from "../../../utils/date-utils.js";

export const getDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const departmentId = req.query.departmentId as string | undefined;

    let data;

    if (req.user.role === USER_ROLES.ADMIN) {
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
    } else if (req.user.role === USER_ROLES.MANAGER) {
      // Cache manager dashboard by user
      const cacheKey = buildCacheKey(
        CACHE_KEYS.DASHBOARD_MANAGER,
        req.user.id,
      );
      data = await getCached(
        cacheKey,
        () => dashboardService.getManagerDashboard(req.user),
        CACHE_TTL.DASHBOARD,
      );
    } else {
      // Cache employee dashboard by user
      const cacheKey = buildCacheKey(
        CACHE_KEYS.DASHBOARD_EMPLOYEE,
        req.user.id,
      );
      data = await getCached(
        cacheKey,
        () => dashboardService.getEmployeeDashboard(req.user.id),
        CACHE_TTL.DASHBOARD,
      );
    }

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const getAdminDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

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
  } catch (error) {
    next(error);
  }
};

export const getLeadAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const now = new Date();
    const startDate =
      (req.query["startDate"] as string) ||
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = (req.query["endDate"] as string) || now.toISOString();
    const teamId = req.query["teamId"] as string | undefined;
    const userId = req.query["userId"] as string | undefined;
    const departmentId = req.query["departmentId"] as string | undefined;

    // Cache analytics for 5 minutes
    const cacheKey = `analytics:leads:${req.user.id}:${startDate.slice(0, 10)}:${endDate.slice(0, 10)}:${teamId || "all"}:${userId || "all"}:${departmentId || "all"}`;
    const data = await getCached(
      cacheKey,
      () =>
        dashboardService.getLeadAnalyticsScoped(req.user, startDate, endDate, {
          teamId,
          userId,
          departmentId,
        }),
      CACHE_TTL.ANALYTICS,
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const getUserPerformance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

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
  } catch (error) {
    next(error);
  }
};

export const getMyPerformance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const now = nowIST();
    const startDate =
      (req.query["startDate"] as string) ||
      getStartOfMonthIST(now.getFullYear(), now.getMonth() + 1);
    const endDate = (req.query["endDate"] as string) || now.toISOString();

    const data = await dashboardService.getUserPerformance(
      req.user.id,
      startDate,
      endDate,
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const getUserWiseAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const now = nowIST();
    const startDate =
      (req.query["startDate"] as string) ||
      getStartOfMonthIST(now.getFullYear(), now.getMonth() + 1);
    const endDate = (req.query["endDate"] as string) || now.toISOString();
    const teamId = req.query["teamId"] as string | undefined;
    const userId = req.query["userId"] as string | undefined;
    const departmentId = req.query["departmentId"] as string | undefined;

    const data = await dashboardService.getUserWiseAnalytics(req.user, {
      startDate,
      endDate,
      teamId,
      userId,
      departmentId,
    });

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const getEnhancedDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const data = await getCached(
      CACHE_KEYS.DASHBOARD_ENHANCED,
      () => dashboardService.getEnhancedAdminDashboard(),
      CACHE_TTL.DASHBOARD,
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};


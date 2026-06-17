import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as dashboardService from "../services/finance-dashboard.service.js";
import { getBaseCurrency } from "../services/finance-currency.util.js";

export const get_dashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const departmentId = req.query["department_id"] as string;

    // If employee, only show their own data
    const userId =
      req.user.role === "employee" ? req.user.id : undefined;

    const data = await dashboardService.getFinanceDashboard(
      departmentId,
      userId,
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const get_dashboard_revenue_trend = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const departmentId = req.query["department_id"] as string;
    const data = await dashboardService.getMonthlyRevenueTrend(departmentId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const get_dashboard_invoice_status = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const departmentId = req.query["department_id"] as string;
    const data =
      await dashboardService.getInvoiceStatusDistribution(departmentId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const get_dashboard_outstanding_clients = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const departmentId = req.query["department_id"] as string;
    const limit = parseInt(req.query["limit"] as string) || 5;
    const data = await dashboardService.getTopOutstandingClients(
      departmentId,
      limit,
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const get_dashboard_activity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const departmentId = req.query["department_id"] as string;
    const limit = parseInt(req.query["limit"] as string) || 10;

    // If employee, only show their own activity
    const userId =
      req.user.role === "employee" ? req.user.id : undefined;

    const data = await dashboardService.getRecentFinanceActivity(
      departmentId,
      limit,
      userId,
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const get_analytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const departmentId = req.query["department_id"] as string;
    const baseCurrency = await getBaseCurrency();

    const [revenueTrend, invoiceStatus, outstandingClients] = await Promise.all(
      [
        dashboardService.getMonthlyRevenueTrend(departmentId),
        dashboardService.getInvoiceStatusDistribution(departmentId),
        dashboardService.getTopOutstandingClients(departmentId, 10),
      ],
    );

    sendSuccess(res, {
      base_currency: baseCurrency,
      revenueTrend,
      invoiceStatus,
      outstandingClients,
    });
  } catch (error) {
    next(error);
  }
};

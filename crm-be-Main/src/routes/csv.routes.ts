import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";
import {
  exportRateLimiter,
  bulkOperationRateLimiter,
} from "../middleware/rate-limiter.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import * as csvService from "../services/csv.service.js";
import { sendSuccess, sendCreated } from "../utils/responses.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";
import { getTodayIST } from "../utils/date-utils.js";

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /csv/leads/template
 * Get CSV template for leads import
 */
router.get(
  "/leads/template",
  asyncHandler(async (_req: Request, res: Response) => {
    const template = csvService.getLeadsCsvTemplate();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=leads_template.csv",
    );
    res.send(template);
  }),
);

/**
 * POST /csv/leads/import
 * Import leads from CSV
 */
router.post(
  "/leads/import",
  requirePermission("leads:import") as any,
  bulkOperationRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { csvData, assignTo, status, rowActions } = req.body;

    if (!csvData) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "CSV data is required");
    }

    const result = await csvService.importLeads(
      csvData,
      authReq.user.id,
      assignTo,
      authReq.user.departmentId,
      status,
      rowActions,
    );

    sendCreated(res, result);
  }),
);

/**
 * POST /csv/leads/preview-check
 * Parse CSV and return duplicate check results (no import happens)
 */
router.post(
  "/leads/preview-check",
  requirePermission("leads:import") as any,
  bulkOperationRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { csvData } = req.body;

    if (!csvData) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "CSV data is required");
    }

    const result = await csvService.checkDuplicates(
      csvData,
      authReq.user.departmentId,
    );

    sendSuccess(res, result);
  }),
);

/**
 * GET /csv/leads/duplicates
 * All authenticated users: admins/managers see all, employees see their assigned duplicates
 */
router.get(
  "/leads/duplicates",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await csvService.getDuplicateLeads(authReq.user);
    sendSuccess(res, result);
  }),
);

/**
 * GET /csv/leads/export
 * Export leads to CSV
 */
router.get(
  "/leads/export",
  requirePermission("leads:export") as any,
  exportRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const wantsRemoval = req.query["removeAfterExport"] === "true";

    if (
      wantsRemoval &&
      !authReq.user.permissions.includes("crm:admin") &&
      !authReq.user.permissions.includes("leads:delete")
    ) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "Missing permission: leads:delete",
      );
    }

    const filters = {
      status: req.query["status"]
        ? (req.query["status"] as string).split(",")
        : undefined,
      source: req.query["source"]
        ? (req.query["source"] as string).split(",")
        : undefined,
      assignedTo: req.query["assignedTo"] as string | undefined,
      startDate: req.query["startDate"] as string | undefined,
      endDate: req.query["endDate"] as string | undefined,
      removeAfterExport: req.query["removeAfterExport"] === "true",
    };

    const result = await csvService.exportLeads(authReq.user, filters);

    const filename = `leads_export_${getTodayIST()}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("X-Exported-Count", result.exportedCount.toString());
    res.setHeader("X-Removed-Count", result.removedCount.toString());
    res.send(result.csv);
  }),
);

export default router;

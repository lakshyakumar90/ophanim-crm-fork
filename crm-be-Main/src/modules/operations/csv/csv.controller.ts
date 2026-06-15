import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as csvService from "./csv.service.js";
import { sendSuccess, sendCreated, ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { getTodayIST } from "../../../utils/date-utils.js";

export const getLeadsCsvTemplate = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = csvService.getLeadsCsvTemplate();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=leads_template.csv",
    );
    res.send(template);
  } catch (error) {
    next(error);
  }
};

export const importLeads = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { csvData, assignTo, status, rowActions } = req.body;

    if (!csvData) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "CSV data is required");
    }

    const result = await csvService.importLeads(
      csvData,
      req.user.id,
      assignTo,
      req.user.departmentId,
      status,
      rowActions,
    );

    sendCreated(res, result);
  } catch (error) {
    next(error);
  }
};

export const previewLeadsImport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { csvData } = req.body;

    if (!csvData) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "CSV data is required");
    }

    const result = await csvService.checkDuplicates(
      csvData,
      req.user.departmentId,
    );

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getDuplicateLeads = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await csvService.getDuplicateLeads(req.user);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const exportLeads = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const wantsRemoval = req.query["removeAfterExport"] === "true";

    if (
      wantsRemoval &&
      !req.user.permissions.includes("crm:admin") &&
      !req.user.permissions.includes("leads:delete")
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

    const result = await csvService.exportLeads(req.user, filters);

    const filename = `leads_export_${getTodayIST()}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("X-Exported-Count", result.exportedCount.toString());
    res.setHeader("X-Removed-Count", result.removedCount.toString());
    res.send(result.csv);
  } catch (error) {
    next(error);
  }
};

import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as orgChartService from "./org-chart.service.js";

export const getOrgChart = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const chart = await orgChartService.getOrgChart();
    sendSuccess(res, chart);
  } catch (error) {
    next(error);
  }
};

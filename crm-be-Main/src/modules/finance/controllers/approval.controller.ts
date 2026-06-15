import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as approvalService from "../services/approval.service.js";

export const get_approvals = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const filters = {
      approval_type: req.query["type"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await approvalService.getPendingApprovals(filters, {
      limit,
      offset,
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const get_approvals_count = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const type = req.query["type"] as string;
    const count = await approvalService.getPendingApprovalCount(type);
    sendSuccess(res, { count });
  } catch (error) {
    next(error);
  }
};

export const post_approvals_bulk_approve = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const result = await approvalService.bulkApprove(
      req.body.approval_ids,
      req.user.id,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

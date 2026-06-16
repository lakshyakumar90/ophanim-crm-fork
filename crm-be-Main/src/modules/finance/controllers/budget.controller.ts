import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess, sendCreated } from "../../../utils/responses.js";
import * as budgetService from "../services/budget.service.js";

export const get_budgets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filters = {
      status: req.query["status"] as string,
      department_id: req.query["department_id"] as string,
      fiscal_year: req.query["fiscal_year"]
        ? parseInt(req.query["fiscal_year"] as string, 10)
        : undefined,
      search: req.query["search"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await budgetService.getBudgets(
      req.user.id,
      req.user.role,
      req.user.departmentId,
      filters,
      { limit, offset },
    );

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const get_budgets_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const budget = await budgetService.getBudgetById(req.params["id"] as string);
    sendSuccess(res, budget);
  } catch (error) {
    next(error);
  }
};

export const post_budgets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const budget = await budgetService.createBudget(req.body, req.user.id);
    sendCreated(res, budget);
  } catch (error) {
    next(error);
  }
};

export const put_budgets_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const budget = await budgetService.updateBudget(
      req.params["id"] as string,
      req.body,
    );
    sendSuccess(res, budget);
  } catch (error) {
    next(error);
  }
};

export const delete_budgets_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await budgetService.deleteBudget(req.params["id"] as string);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
};

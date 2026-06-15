import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import {
  sendSuccess,
  sendCreated,
} from "../../../utils/responses.js";
import * as expenseService from "../services/expense.service.js";

export const get_expenses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const filters = {
      status: req.query["status"] as string,
      category_id: req.query["category_id"] as string,
      department_id: req.query["department_id"] as string,
      submitted_by: req.query["submitted_by"] as string,
      from_date: req.query["from_date"] as string,
      to_date: req.query["to_date"] as string,
      search: req.query["search"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await expenseService.getExpenses(
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

export const get_expenses_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const expense = await expenseService.getExpenseById(
      req.params["id"] as string,
    );
    sendSuccess(res, expense);
  } catch (error) {
    next(error);
  }
};

export const post_expenses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const expense = await expenseService.submitExpense(
      req.body,
      req.user.id,
    );
    sendCreated(res, expense);
  } catch (error) {
    next(error);
  }
};

export const put_expenses_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const expense = await expenseService.updateExpense(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendSuccess(res, expense);
  } catch (error) {
    next(error);
  }
};

export const post_expenses_id_approve = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const expense = await expenseService.approveExpense(
      req.params["id"] as string,
      req.user.id,
    );
    sendSuccess(res, expense);
  } catch (error) {
    next(error);
  }
};

export const post_expenses_id_reject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const expense = await expenseService.rejectExpense(
      req.params["id"] as string,
      req.user.id,
      req.body.reason,
    );
    sendSuccess(res, expense);
  } catch (error) {
    next(error);
  }
};

export const get_expense_categories = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const activeOnly = req.query["active_only"] !== "false";
    const categories = await expenseService.getExpenseCategories(activeOnly);
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
};

export const post_expense_categories = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const category = await expenseService.createExpenseCategory(req.body);
    sendCreated(res, category);
  } catch (error) {
    next(error);
  }
};

export const put_expense_categories_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const category = await expenseService.updateExpenseCategory(
      req.params["id"] as string,
      req.body,
    );
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
};

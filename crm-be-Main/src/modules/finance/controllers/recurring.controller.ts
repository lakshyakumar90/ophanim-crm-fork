import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from "../../../utils/responses.js";
import * as recurringService from "../services/recurring.service.js";

export const get_recurring = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const filters = {
      is_active:
        req.query["is_active"] === "true"
          ? true
          : req.query["is_active"] === "false"
            ? false
            : undefined,
      lead_id: req.query["lead_id"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await recurringService.getRecurringSchedules(
      req.user.id,
      req.user.role,
      filters,
      { limit, offset },
    );

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const get_recurring_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const schedule = await recurringService.getRecurringScheduleById(
      req.params["id"] as string,
    );
    sendSuccess(res, schedule);
  } catch (error) {
    next(error);
  }
};

export const post_recurring = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const schedule = await recurringService.createRecurringSchedule(
      req.body,
      req.user.id,
    );
    sendCreated(res, schedule);
  } catch (error) {
    next(error);
  }
};

export const put_recurring_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const schedule = await recurringService.updateRecurringSchedule(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendSuccess(res, schedule);
  } catch (error) {
    next(error);
  }
};

export const post_recurring_id_pause = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const schedule = await recurringService.pauseRecurringSchedule(
      req.params["id"] as string,
    );
    sendSuccess(res, schedule);
  } catch (error) {
    next(error);
  }
};

export const post_recurring_id_resume = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const schedule = await recurringService.resumeRecurringSchedule(
      req.params["id"] as string,
    );
    sendSuccess(res, schedule);
  } catch (error) {
    next(error);
  }
};

export const delete_recurring_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    await recurringService.deleteRecurringSchedule(req.params["id"] as string);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

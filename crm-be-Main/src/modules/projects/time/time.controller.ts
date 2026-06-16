import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess, sendCreated } from "../../../utils/responses.js";
import * as timeService from "./time.service.js";
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  timeEntryListQuerySchema,
  rejectTimeEntrySchema,
} from "./time.validator.js";

export const list = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = timeEntryListQuerySchema.parse(req.query);
    const entries = await timeService.listTimeEntries(req.user, query);
    sendSuccess(res, entries);
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const entry = await timeService.getTimeEntryById(
      req.user,
      req.params.id as string,
    );
    sendSuccess(res, entry);
  } catch (error) {
    next(error);
  }
};

export const create = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = createTimeEntrySchema.parse(req.body);
    const entry = await timeService.createTimeEntry(req.user, input);
    sendCreated(res, entry);
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = updateTimeEntrySchema.parse(req.body);
    const entry = await timeService.updateTimeEntry(
      req.user,
      req.params.id as string,
      input,
    );
    sendSuccess(res, entry);
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await timeService.deleteTimeEntry(req.user, req.params.id as string);
    sendSuccess(res, null);
  } catch (error) {
    next(error);
  }
};

export const submit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const entry = await timeService.submitTimeEntry(
      req.user,
      req.params.id as string,
    );
    sendSuccess(res, entry);
  } catch (error) {
    next(error);
  }
};

export const approve = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const entry = await timeService.approveTimeEntry(
      req.user,
      req.params.id as string,
    );
    sendSuccess(res, entry);
  } catch (error) {
    next(error);
  }
};

export const reject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reason } = rejectTimeEntrySchema.parse(req.body);
    const entry = await timeService.rejectTimeEntry(
      req.user,
      req.params.id as string,
      reason,
    );
    sendSuccess(res, entry);
  } catch (error) {
    next(error);
  }
};

import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as shiftsService from "./shifts.service.js";

export const listShifts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shifts = await shiftsService.listShifts(req.query as any);
    sendSuccess(res, shifts);
  } catch (error) {
    next(error);
  }
};

export const getMyShifts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shifts = await shiftsService.getMyShifts(req.user.id, req.query as any);
    sendSuccess(res, shifts);
  } catch (error) {
    next(error);
  }
};

export const getShiftById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shift = await shiftsService.getShiftById(req.params.id as string);
    sendSuccess(res, shift);
  } catch (error) {
    next(error);
  }
};

export const createShift = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shift = await shiftsService.createShift(req.body, req.user.id);
    sendSuccess(res, shift, 201);
  } catch (error) {
    next(error);
  }
};

export const bulkCreateShifts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { shifts } = req.body as { shifts: Record<string, unknown>[] };
    const created = await shiftsService.bulkCreateShifts(shifts, req.user.id);
    sendSuccess(res, created, 201);
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shift = await shiftsService.updateShift(req.params.id as string, req.body);
    sendSuccess(res, shift);
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await shiftsService.deleteShift(req.params.id as string);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
};

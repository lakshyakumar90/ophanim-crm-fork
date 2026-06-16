import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as exitService from "./exit.service.js";

export const listExitChecklists = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const checklists = await exitService.listExitChecklists(req.query as any);
    sendSuccess(res, checklists);
  } catch (error) {
    next(error);
  }
};

export const getExitChecklistById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const checklist = await exitService.getExitChecklistById(req.params.id as string);
    sendSuccess(res, checklist);
  } catch (error) {
    next(error);
  }
};

export const getExitChecklistByUserId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const checklists = await exitService.getExitChecklistByUserId(
      req.params.userId as string,
    );
    sendSuccess(res, checklists);
  } catch (error) {
    next(error);
  }
};

export const createExitChecklist = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const checklist = await exitService.createExitChecklist(req.body, req.user.id);
    sendSuccess(res, checklist, 201);
  } catch (error) {
    next(error);
  }
};

export const updateExitChecklist = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const checklist = await exitService.updateExitChecklist(
      req.params.id as string,
      req.body,
    );
    sendSuccess(res, checklist);
  } catch (error) {
    next(error);
  }
};

export const completeExitItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { item_id } = req.body as { item_id: string };
    const checklist = await exitService.completeExitItem(
      req.params.id as string,
      item_id,
    );
    sendSuccess(res, checklist);
  } catch (error) {
    next(error);
  }
};

import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess, sendCreated } from "../../../utils/responses.js";
import * as milestonesService from "./milestones.service.js";
import {
  createMilestoneSchema,
  updateMilestoneSchema,
  createDeliverableSchema,
  updateDeliverableSchema,
} from "./milestones.validator.js";

export const list = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const milestones = await milestonesService.listMilestones(
      req.params.projectId as string,
      req.user,
    );
    sendSuccess(res, milestones);
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
    const milestone = await milestonesService.getMilestoneById(
      req.params.projectId as string,
      req.params.milestoneId as string,
      req.user,
    );
    sendSuccess(res, milestone);
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
    const input = createMilestoneSchema.parse(req.body);
    const milestone = await milestonesService.createMilestone(
      req.params.projectId as string,
      req.user,
      input,
    );
    sendCreated(res, milestone);
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
    const input = updateMilestoneSchema.parse(req.body);
    const milestone = await milestonesService.updateMilestone(
      req.params.projectId as string,
      req.params.milestoneId as string,
      req.user,
      input,
    );
    sendSuccess(res, milestone);
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
    await milestonesService.deleteMilestone(
      req.params.projectId as string,
      req.params.milestoneId as string,
      req.user,
    );
    sendSuccess(res, null);
  } catch (error) {
    next(error);
  }
};

export const listDeliverables = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const deliverables = await milestonesService.listDeliverables(
      req.params.projectId as string,
      req.params.milestoneId as string,
      req.user,
    );
    sendSuccess(res, deliverables);
  } catch (error) {
    next(error);
  }
};

export const createDeliverable = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = createDeliverableSchema.parse(req.body);
    const deliverable = await milestonesService.createDeliverable(
      req.params.projectId as string,
      req.params.milestoneId as string,
      req.user,
      input,
    );
    sendCreated(res, deliverable);
  } catch (error) {
    next(error);
  }
};

export const updateDeliverable = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = updateDeliverableSchema.parse(req.body);
    const deliverable = await milestonesService.updateDeliverable(
      req.params.projectId as string,
      req.params.milestoneId as string,
      req.params.deliverableId as string,
      req.user,
      input,
    );
    sendSuccess(res, deliverable);
  } catch (error) {
    next(error);
  }
};

export const deleteDeliverable = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await milestonesService.deleteDeliverable(
      req.params.projectId as string,
      req.params.milestoneId as string,
      req.params.deliverableId as string,
      req.user,
    );
    sendSuccess(res, null);
  } catch (error) {
    next(error);
  }
};

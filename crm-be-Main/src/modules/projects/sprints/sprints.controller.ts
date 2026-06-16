import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess, sendCreated } from "../../../utils/responses.js";
import * as sprintsService from "./sprints.service.js";
import { createSprintSchema, updateSprintSchema } from "./sprints.validator.js";

export const list = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sprints = await sprintsService.listSprints(
      req.params.projectId as string,
      req.user,
    );
    sendSuccess(res, sprints);
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
    const sprint = await sprintsService.getSprintById(
      req.params.projectId as string,
      req.params.sprintId as string,
      req.user,
    );
    sendSuccess(res, sprint);
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
    const input = createSprintSchema.parse(req.body);
    const sprint = await sprintsService.createSprint(
      req.params.projectId as string,
      req.user,
      input,
    );
    sendCreated(res, sprint);
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
    const input = updateSprintSchema.parse(req.body);
    const sprint = await sprintsService.updateSprint(
      req.params.projectId as string,
      req.params.sprintId as string,
      req.user,
      input,
    );
    sendSuccess(res, sprint);
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
    await sprintsService.deleteSprint(
      req.params.projectId as string,
      req.params.sprintId as string,
      req.user,
    );
    sendSuccess(res, null);
  } catch (error) {
    next(error);
  }
};

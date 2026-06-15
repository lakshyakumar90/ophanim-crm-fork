import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as tasksService from "./tasks.service.js";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from "../../../utils/responses.js";

export const getTasks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await tasksService.getTasks(req.query as any, req.user);
    sendPaginated(res, result.data, result.meta);
  } catch (error) {
    next(error);
  }
};

export const getMyTasksSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const summary = await tasksService.getMyTasksSummary(req.user.id);
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
};

export const createTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await tasksService.createTask(req.body, req.user);
    sendCreated(res, task);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await tasksService.getTaskById(req.params["id"] as string);
    sendSuccess(res, task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await tasksService.updateTask(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendSuccess(res, task);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await tasksService.deleteTask(req.params["id"] as string, req.user.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const reassignTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await tasksService.reassignTask(
      req.params["id"] as string,
      req.body,
      req.user,
    );
    sendSuccess(res, task);
  } catch (error) {
    next(error);
  }
};

export const getTaskComments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const comments = await tasksService.getTaskComments(
      req.params["id"] as string,
    );
    sendSuccess(res, comments);
  } catch (error) {
    next(error);
  }
};

export const addTaskComment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await tasksService.addTaskComment(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendCreated(res, { message: "Comment added successfully" });
  } catch (error) {
    next(error);
  }
};

export const checkDueReminders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await tasksService.checkDueReminders(req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

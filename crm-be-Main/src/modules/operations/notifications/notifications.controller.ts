import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as notificationsService from "./notifications.service.js";
import {
  sendSuccess,
  sendPaginated,
  sendNoContent,
} from "../../../utils/responses.js";

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await notificationsService.getNotifications(
      req.user.id,
      req.query as any,
    );
    sendPaginated(res, result.data, result.meta);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const count = await notificationsService.getUnreadCount(req.user.id);
    sendSuccess(res, { count });
  } catch (error) {
    next(error);
  }
};

export const getPreferences = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const prefs = await notificationsService.getPreferences(req.user.id);
    sendSuccess(res, prefs);
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const prefs = await notificationsService.updatePreferences(
      req.user.id,
      req.body,
    );
    sendSuccess(res, prefs);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await notificationsService.markAsRead(
      req.params["id"] as string,
      req.user.id,
    );
    sendSuccess(res, { message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await notificationsService.markAllAsRead(req.user.id);
    sendSuccess(res, { message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await notificationsService.deleteNotification(
      req.params["id"] as string,
      req.user.id,
    );
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

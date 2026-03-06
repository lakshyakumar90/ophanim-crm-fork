import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { uuidParamSchema } from "../validators/users.validator.js";
import { updateNotificationPreferencesSchema } from "../validators/notifications.validator.js";
import * as notificationsService from "../services/notifications.service.js";
import {
  sendSuccess,
  sendPaginated,
  sendNoContent,
} from "../utils/responses.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /notifications
 * Get notifications for current user
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await notificationsService.getNotifications(
      authReq.user.id,
      req.query as any
    );
    sendPaginated(res, result.data, result.meta);
  })
);

/**
 * GET /notifications/unread-count
 * Get unread notifications count
 */
router.get(
  "/unread-count",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const count = await notificationsService.getUnreadCount(authReq.user.id);
    sendSuccess(res, { count });
  })
);

/**
 * GET /notifications/preferences
 * Get notification preferences
 */
router.get(
  "/preferences",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const prefs = await notificationsService.getPreferences(authReq.user.id);
    sendSuccess(res, prefs);
  })
);

/**
 * PUT /notifications/preferences
 * Update notification preferences
 */
router.put(
  "/preferences",
  validateBody(updateNotificationPreferencesSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const prefs = await notificationsService.updatePreferences(
      authReq.user.id,
      req.body
    );
    sendSuccess(res, prefs);
  })
);

/**
 * POST /notifications/:id/read
 * Mark notification as read
 */
router.post(
  "/:id/read",
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await notificationsService.markAsRead(
      req.params["id"] as string,
      authReq.user.id
    );
    sendSuccess(res, { message: "Notification marked as read" });
  })
);

/**
 * POST /notifications/read-all
 * Mark all notifications as read
 */
router.post(
  "/read-all",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await notificationsService.markAllAsRead(authReq.user.id);
    sendSuccess(res, { message: "All notifications marked as read" });
  })
);

/**
 * DELETE /notifications/:id
 * Delete notification
 */
router.delete(
  "/:id",
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await notificationsService.deleteNotification(
      req.params["id"] as string,
      authReq.user.id
    );
    sendNoContent(res);
  })
);

export default router;

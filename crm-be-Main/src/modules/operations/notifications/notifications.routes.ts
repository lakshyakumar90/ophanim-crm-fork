import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { uuidParamSchema } from "../../core/users/users.validator.js";
import { updateNotificationPreferencesSchema } from "./notifications.validator.js";
import * as notificationsController from "./notifications.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get("/", asyncHandler(notificationsController.getNotifications) as RequestHandler);

router.get(
  "/unread-count",
  asyncHandler(notificationsController.getUnreadCount) as RequestHandler,
);

router.get(
  "/preferences",
  asyncHandler(notificationsController.getPreferences) as RequestHandler,
);

router.put(
  "/preferences",
  validateBody(updateNotificationPreferencesSchema),
  asyncHandler(notificationsController.updatePreferences) as RequestHandler,
);

router.post(
  "/:id/read",
  validateParams(uuidParamSchema),
  asyncHandler(notificationsController.markAsRead) as RequestHandler,
);

router.post(
  "/read-all",
  asyncHandler(notificationsController.markAllAsRead) as RequestHandler,
);

router.delete(
  "/:id",
  validateParams(uuidParamSchema),
  asyncHandler(notificationsController.deleteNotification) as RequestHandler,
);

export default router;

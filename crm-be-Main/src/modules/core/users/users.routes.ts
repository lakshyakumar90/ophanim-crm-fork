import { Router, type Router as RouterType, type RequestHandler } from "express";
import multer from "multer";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requireAdmin,
  requireManager,
  requireManagerOrHRAccess,
  checkResourceAccess,
} from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import {
  updateUserSchema,
  updateProfileSchema,
  userListQuerySchema,
  uuidParamSchema,
  bulkUpdateUsersSchema,
} from "../users/users.validator.js";
import { adminResetPasswordSchema } from "../../auth/auth/auth.validator.js";
import * as usersController from "./users.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/",
  requireManager as any,
  validateQuery(userListQuerySchema),
  asyncHandler(usersController.getUsers) as RequestHandler,
);

router.get("/me", asyncHandler(usersController.getMe) as RequestHandler);

router.put(
  "/me",
  validateBody(updateProfileSchema),
  asyncHandler(usersController.updateMe) as RequestHandler,
);

router.patch(
  "/me/preferences",
  validateBody(updateProfileSchema),
  asyncHandler(usersController.updateMyPreferences) as RequestHandler,
);

router.post(
  "/me/avatar",
  upload.single("file"),
  asyncHandler(usersController.uploadAvatar) as RequestHandler,
);

router.get(
  "/team",
  requireManager as any,
  asyncHandler(usersController.getMyTeam) as RequestHandler,
);

router.get(
  "/job-titles",
  asyncHandler(usersController.getJobTitles) as RequestHandler,
);

router.get(
  "/project-managers",
  asyncHandler(usersController.getProjectManagers) as RequestHandler,
);

router.get(
  "/by-job-title",
  asyncHandler(usersController.getUsersByJobTitle) as RequestHandler,
);

router.post(
  "/bulk-update",
  requireAdmin as any,
  validateBody(bulkUpdateUsersSchema),
  asyncHandler(usersController.bulkUpdateUsers) as RequestHandler,
);

router.get(
  "/:id",
  requireManagerOrHRAccess() as any,
  validateParams(uuidParamSchema),
  checkResourceAccess("user") as any,
  asyncHandler(usersController.getUserById) as RequestHandler,
);

router.put(
  "/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(updateUserSchema),
  asyncHandler(usersController.updateUser) as RequestHandler,
);

router.patch(
  "/:id/activate",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  asyncHandler(usersController.activateUser) as RequestHandler,
);

router.patch(
  "/:id/deactivate",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  asyncHandler(usersController.deactivateUser) as RequestHandler,
);

router.patch(
  "/:id/password",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(adminResetPasswordSchema),
  asyncHandler(usersController.resetUserPassword) as RequestHandler,
);

router.get(
  "/teams/:teamId",
  requireManager as any,
  asyncHandler(usersController.getTeamMembers) as RequestHandler,
);

export default router;

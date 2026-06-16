import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requirePermission,
  requireAnyPermission,
  checkResourceAccess,
} from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import {
  createTaskSchema,
  updateTaskSchema,
  taskListQuerySchema,
  reassignTaskSchema,
  createCommentSchema,
} from "./tasks.validator.js";
import { uuidParamSchema } from "../../core/users/users.validator.js";
import * as tasksController from "./tasks.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/",
  requirePermission("tasks:view") as any,
  validateQuery(taskListQuerySchema),
  asyncHandler(tasksController.getTasks) as RequestHandler,
);

router.get(
  "/summary",
  requirePermission("tasks:view") as any,
  asyncHandler(tasksController.getMyTasksSummary) as RequestHandler,
);

router.post(
  "/",
  requirePermission("tasks:create") as any,
  validateBody(createTaskSchema),
  asyncHandler(tasksController.createTask) as RequestHandler,
);

router.get(
  "/:id",
  requirePermission("tasks:view") as any,
  validateParams(uuidParamSchema),
  checkResourceAccess("task") as any,
  asyncHandler(tasksController.getTaskById) as RequestHandler,
);

router.put(
  "/:id",
  requireAnyPermission(["tasks:edit", "tasks:assign"]) as any,
  validateParams(uuidParamSchema),
  validateBody(updateTaskSchema),
  checkResourceAccess("task") as any,
  asyncHandler(tasksController.updateTask) as RequestHandler,
);

router.delete(
  "/:id",
  requirePermission("tasks:delete") as any,
  validateParams(uuidParamSchema),
  asyncHandler(tasksController.deleteTask) as RequestHandler,
);

router.post(
  "/:id/reassign",
  requirePermission("tasks:assign") as any,
  validateParams(uuidParamSchema),
  validateBody(reassignTaskSchema),
  asyncHandler(tasksController.reassignTask) as RequestHandler,
);

router.get(
  "/:id/comments",
  requirePermission("tasks:view") as any,
  validateParams(uuidParamSchema),
  checkResourceAccess("task") as any,
  asyncHandler(tasksController.getTaskComments) as RequestHandler,
);

router.post(
  "/:id/comments",
  requirePermission("tasks:view") as any,
  validateParams(uuidParamSchema),
  validateBody(createCommentSchema),
  checkResourceAccess("task") as any,
  asyncHandler(tasksController.addTaskComment) as RequestHandler,
);

router.post(
  "/reminders/check",
  asyncHandler(tasksController.checkDueReminders) as RequestHandler,
);

export default router;

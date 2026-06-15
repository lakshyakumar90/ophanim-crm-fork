import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requireManager,
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
  validateQuery(taskListQuerySchema),
  asyncHandler(tasksController.getTasks) as RequestHandler,
);

router.get("/summary", asyncHandler(tasksController.getMyTasksSummary) as RequestHandler);

router.post(
  "/",
  validateBody(createTaskSchema),
  asyncHandler(tasksController.createTask) as RequestHandler,
);

router.get(
  "/:id",
  validateParams(uuidParamSchema),
  checkResourceAccess("task") as any,
  asyncHandler(tasksController.getTaskById) as RequestHandler,
);

router.put(
  "/:id",
  validateParams(uuidParamSchema),
  validateBody(updateTaskSchema),
  checkResourceAccess("task") as any,
  asyncHandler(tasksController.updateTask) as RequestHandler,
);

router.delete(
  "/:id",
  requireManager as any,
  validateParams(uuidParamSchema),
  asyncHandler(tasksController.deleteTask) as RequestHandler,
);

router.post(
  "/:id/reassign",
  requireManager as any,
  validateParams(uuidParamSchema),
  validateBody(reassignTaskSchema),
  asyncHandler(tasksController.reassignTask) as RequestHandler,
);

router.get(
  "/:id/comments",
  validateParams(uuidParamSchema),
  checkResourceAccess("task") as any,
  asyncHandler(tasksController.getTaskComments) as RequestHandler,
);

router.post(
  "/:id/comments",
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

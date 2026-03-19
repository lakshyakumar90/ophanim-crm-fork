import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  requireManager,
  checkResourceAccess,
} from "../middleware/authorization.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  createTaskSchema,
  updateTaskSchema,
  taskListQuerySchema,
  reassignTaskSchema,
  createCommentSchema,
} from "../validators/tasks.validator.js";
import { uuidParamSchema } from "../validators/users.validator.js";
import * as tasksService from "../services/tasks.service.js";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from "../utils/responses.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /tasks
 * Get paginated list of tasks
 */
router.get(
  "/",
  validateQuery(taskListQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await tasksService.getTasks(req.query as any, authReq.user);
    sendPaginated(res, result.data, result.meta);
  }),
);

/**
 * GET /tasks/summary
 * Get task summary for current user
 */
router.get(
  "/summary",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const summary = await tasksService.getMyTasksSummary(authReq.user.id);
    sendSuccess(res, summary);
  }),
);

/**
 * POST /tasks
 * Create new task (any user can create - non-managers only for themselves)
 */
router.post(
  "/",
  validateBody(createTaskSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const task = await tasksService.createTask(req.body, authReq.user);
    sendCreated(res, task);
  }),
);

/**
 * GET /tasks/:id
 * Get task by ID
 */
router.get(
  "/:id",
  validateParams(uuidParamSchema),
  checkResourceAccess("task") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const task = await tasksService.getTaskById(req.params["id"] as string);
    sendSuccess(res, task);
  }),
);

/**
 * PUT /tasks/:id
 * Update task
 */
router.put(
  "/:id",
  validateParams(uuidParamSchema),
  validateBody(updateTaskSchema),
  checkResourceAccess("task") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const task = await tasksService.updateTask(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, task);
  }),
);

/**
 * DELETE /tasks/:id
 * Delete task (soft delete)
 */
router.delete(
  "/:id",
  requireManager as any,
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await tasksService.deleteTask(req.params["id"] as string, authReq.user.id);
    sendNoContent(res);
  }),
);

/**
 * POST /tasks/:id/reassign
 * Reassign task
 */
router.post(
  "/:id/reassign",
  requireManager as any,
  validateParams(uuidParamSchema),
  validateBody(reassignTaskSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const task = await tasksService.reassignTask(
      req.params["id"] as string,
      req.body,
      authReq.user,
    );
    sendSuccess(res, task);
  }),
);

/**
 * GET /tasks/:id/comments
 * Get task comments
 */
router.get(
  "/:id/comments",
  validateParams(uuidParamSchema),
  checkResourceAccess("task") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const comments = await tasksService.getTaskComments(
      req.params["id"] as string,
    );
    sendSuccess(res, comments);
  }),
);

/**
 * POST /tasks/:id/comments
 * Add comment to task
 */
router.post(
  "/:id/comments",
  validateParams(uuidParamSchema),
  validateBody(createCommentSchema),
  checkResourceAccess("task") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await tasksService.addTaskComment(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendCreated(res, { message: "Comment added successfully" });
  }),
);

/**
 * POST /tasks/reminders/check
 * Check and send reminder notifications for due tasks assigned to the current user.
 * Safe to call on app load and periodically (every 5 min). Idempotent — uses reminder_sent flag.
 */
router.post(
  "/reminders/check",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await tasksService.checkDueReminders(authReq.user.id);
    sendSuccess(res, result);
  }),
);

export default router;

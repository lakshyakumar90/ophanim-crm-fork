import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  requireAdmin,
  requireManager,
  requirePermission,
  checkResourceAccess,
  checkLeadEditAccess,
} from "../middleware/authorization.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/validation.middleware.js";
import { bulkOperationRateLimiter } from "../middleware/rate-limiter.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  createLeadSchema,
  updateLeadSchema,
  leadListQuerySchema,
  assignLeadSchema,
  bulkAssignSchema,
  bulkUpdateLeadsSchema,
  bulkDeleteSchema,
  createActivitySchema,
  changeStatusSchema,
  createCommentSchema,
  updateCommentSchema,
  createLeadReminderSchema,
  leadCommentParamSchema,
} from "../validators/leads.validator.js";
import { uuidParamSchema } from "../validators/users.validator.js";
import * as leadsService from "../services/leads.service.js";
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
 * GET /leads
 * Get paginated list of leads with filters
 */
router.get(
  "/",
  validateQuery(leadListQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await leadsService.getLeads(req.query as any, authReq.user);
    sendPaginated(res, result.data, result.meta);
  }),
);

/**
 * GET /leads/pipeline
 * Get lead pipeline summary
 */
router.get(
  "/pipeline",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const pipeline = await leadsService.getLeadPipeline(authReq.user);
    sendSuccess(res, pipeline);
  }),
);

/**
 * GET /leads/won
 * Get won leads (customers) for project linking
 */
router.get(
  "/won",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const leads = await leadsService.getWonLeads(authReq.user);
    sendSuccess(res, leads);
  }),
);

/**
 * GET /leads/stats/by-user
 * Get lead counts per user for filtering
 */
router.get(
  "/stats/by-user",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const stats = await leadsService.getLeadCountsByUser(authReq.user);
    sendSuccess(res, stats);
  }),
);

/**
 * POST /leads
 * Create new lead
 */
router.post(
  "/",
  requirePermission("leads:create") as any,
  validateBody(createLeadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const lead = await leadsService.createLead(
      req.body,
      authReq.user.id,
      authReq.user.departmentId,
    );
    sendCreated(res, lead);
  }),
);

/**
 * POST /leads/bulk-assign
 * Bulk assign leads to user
 */
router.post(
  "/bulk-assign",
  requirePermission("leads:assign") as any,
  bulkOperationRateLimiter,
  validateBody(bulkAssignSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await leadsService.bulkAssignLeads(
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, result);
  }),
);

/**
 * POST /leads/bulk-update
 * Bulk update leads
 */
router.post(
  "/bulk-update",
  requirePermission("leads:edit") as any,
  bulkOperationRateLimiter,
  validateBody(bulkUpdateLeadsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await leadsService.bulkUpdateLeads(
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, result);
  }),
);

/**
 * POST /leads/bulk-delete
 * Bulk delete leads
 */
router.post(
  "/bulk-delete",
  requirePermission("leads:delete") as any,
  bulkOperationRateLimiter,
  validateBody(bulkDeleteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await leadsService.bulkDeleteLeads(req.body);
    sendSuccess(res, result);
  }),
);

/**
 * GET /leads/reminders/all
 * Get all reminders for authorized user (or filtered for admin)
 */
router.get(
  "/reminders/all",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { page, limit, userId, sortBy, sortOrder, status, date } =
      req.query as any;

    // Parse pagination
    const query = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      userId,
      sortBy,
      sortOrder,
      status,
      date,
    };

    const result = await leadsService.getAllReminders(query, authReq.user);
    sendPaginated(res, result.data, result.meta);
  }),
);

/**
 * GET /leads/reminders/count
 * Get reminders count for authorized user (or filtered for admin)
 */
router.get(
  "/reminders/count",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { userId, status, date } = req.query as any;

    const count = await leadsService.getRemindersCount(
      { userId, status, date },
      authReq.user,
    );

    sendSuccess(res, { count });
  }),
);

/**
 * GET /leads/:id
 * Get lead by ID
 */
router.get(
  "/:id",
  validateParams(uuidParamSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadsService.getLeadById(req.params["id"] as string);
    sendSuccess(res, lead);
  }),
);

/**
 * PUT /leads/:id
 * Update lead
 */
router.put(
  "/:id",
  validateParams(uuidParamSchema),
  validateBody(updateLeadSchema),
  checkLeadEditAccess() as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const lead = await leadsService.updateLead(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, lead);
  }),
);

/**
 * DELETE /leads/:id
 * Delete lead (soft delete)
 */
router.delete(
  "/:id",
  requireManager as any,
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await leadsService.deleteLead(req.params["id"] as string);
    sendNoContent(res);
  }),
);

/**
 * POST /leads/:id/assign
 * Assign lead to user
 */
router.post(
  "/:id/assign",
  requirePermission("leads:assign") as any,
  validateParams(uuidParamSchema),
  validateBody(assignLeadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const lead = await leadsService.assignLead(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, lead);
  }),
);

/**
 * GET /leads/:id/activities
 * Get lead activities
 */
router.get(
  "/:id/activities",
  validateParams(uuidParamSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const activities = await leadsService.getLeadActivities(
      req.params["id"] as string,
    );
    sendSuccess(res, activities);
  }),
);

/**
 * POST /leads/:id/activities
 * Add activity to lead
 */
router.post(
  "/:id/activities",
  validateParams(uuidParamSchema),
  validateBody(createActivitySchema),
  checkResourceAccess("lead") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await leadsService.addLeadActivity(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendCreated(res, { message: "Activity added successfully" });
  }),
);

/**
 * PATCH /leads/:id/status
 * Change lead status (any user with access to lead)
 */
router.patch(
  "/:id/status",
  validateParams(uuidParamSchema),
  validateBody(changeStatusSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const lead = await leadsService.updateLeadStatus(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, lead);
  }),
);

/**
 * GET /leads/:id/comments
 * Get all comments for a lead
 */
router.get(
  "/:id/comments",
  validateParams(uuidParamSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const comments = await leadsService.getLeadComments(
      req.params["id"] as string,
    );
    sendSuccess(res, comments);
  }),
);

/**
 * POST /leads/:id/comments
 * Add comment to lead (any authenticated user with access)
 */
router.post(
  "/:id/comments",
  validateParams(uuidParamSchema),
  validateBody(createCommentSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const comment = await leadsService.addLeadComment(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendCreated(res, comment);
  }),
);

/**
 * PUT /leads/:id/comments/:commentId
 * Update comment (admin only)
 */
router.put(
  "/:id/comments/:commentId",
  requireAdmin as any,
  validateParams(leadCommentParamSchema),
  validateBody(updateCommentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const comment = await leadsService.updateLeadComment(
      req.params["commentId"] as string,
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, comment);
  }),
);

/**
 * DELETE /leads/:id/comments/:commentId
 * Delete comment (admin only)
 */
router.delete(
  "/:id/comments/:commentId",
  requireAdmin as any,
  validateParams(leadCommentParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await leadsService.deleteLeadComment(req.params["commentId"] as string);
    sendNoContent(res);
  }),
);

// ============ REMINDER ROUTES ============

/**
 * GET /leads/:id/reminders
 * Get reminders for a lead (user's own reminders only)
 */
router.get(
  "/:id/reminders",
  validateParams(uuidParamSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const reminders = await leadsService.getLeadReminders(
      req.params["id"] as string,
      authReq.user,
    );
    sendSuccess(res, reminders);
  }),
);

/**
 * POST /leads/:id/reminders
 * Create reminder for a lead
 */
router.post(
  "/:id/reminders",
  validateParams(uuidParamSchema),
  validateBody(createLeadReminderSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { reminderAt, note } = req.body;
    const reminder = await leadsService.createLeadReminder(
      req.params["id"] as string,
      authReq.user.id,
      reminderAt,
      note,
    );
    sendCreated(res, reminder);
  }),
);

/**
 * DELETE /leads/:id/reminders/:reminderId
 * Delete a lead reminder
 */
router.delete(
  "/:id/reminders/:reminderId",
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await leadsService.deleteLeadReminder(
      req.params["reminderId"] as string,
      authReq.user,
    );
    sendNoContent(res);
  }),
);

/**
 * PATCH /leads/reminders/:reminderId/done
 * Mark a reminder as done
 */
router.patch(
  "/reminders/:reminderId/done",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const reminder = await leadsService.markReminderDone(
      req.params["reminderId"] as string,
      authReq.user,
    );
    sendSuccess(res, reminder);
  }),
);

export default router;

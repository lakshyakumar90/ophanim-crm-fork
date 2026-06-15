import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requireAdmin,
  requireManager,
  requirePermission,
  checkResourceAccess,
  checkLeadEditAccess,
} from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../../middleware/validation.middleware.js";
import { bulkOperationRateLimiter } from "../../../middleware/rate-limiter.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
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
} from "./leads.validator.js";
import { uuidParamSchema } from "../../core/users/users.validator.js";
import * as leadsController from "./leads.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/",
  validateQuery(leadListQuerySchema),
  asyncHandler(leadsController.getLeads) as RequestHandler,
);

router.get("/pipeline", asyncHandler(leadsController.getLeadPipeline) as RequestHandler);

router.get("/won", asyncHandler(leadsController.getWonLeads) as RequestHandler);

router.get("/stats/by-user", asyncHandler(leadsController.getLeadCountsByUser) as RequestHandler);

router.post(
  "/",
  requirePermission("leads:create") as any,
  validateBody(createLeadSchema),
  asyncHandler(leadsController.createLead) as RequestHandler,
);

router.post(
  "/bulk-assign",
  requirePermission("leads:assign") as any,
  bulkOperationRateLimiter,
  validateBody(bulkAssignSchema),
  asyncHandler(leadsController.bulkAssignLeads) as RequestHandler,
);

router.post(
  "/bulk-update",
  requirePermission("leads:edit") as any,
  bulkOperationRateLimiter,
  validateBody(bulkUpdateLeadsSchema),
  asyncHandler(leadsController.bulkUpdateLeads) as RequestHandler,
);

router.post(
  "/bulk-delete",
  requirePermission("leads:delete") as any,
  bulkOperationRateLimiter,
  validateBody(bulkDeleteSchema),
  asyncHandler(leadsController.bulkDeleteLeads) as RequestHandler,
);

router.get("/reminders/all", asyncHandler(leadsController.getAllReminders) as RequestHandler);

router.get("/reminders/count", asyncHandler(leadsController.getRemindersCount) as RequestHandler);

router.get(
  "/:id",
  validateParams(uuidParamSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(leadsController.getLeadById) as RequestHandler,
);

router.get(
  "/:id/page-data",
  validateParams(uuidParamSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(leadsController.getLeadDetailPageData) as RequestHandler,
);

router.put(
  "/:id",
  validateParams(uuidParamSchema),
  validateBody(updateLeadSchema),
  checkLeadEditAccess() as any,
  asyncHandler(leadsController.updateLead) as RequestHandler,
);

router.delete(
  "/:id",
  requireManager as any,
  validateParams(uuidParamSchema),
  asyncHandler(leadsController.deleteLead) as RequestHandler,
);

router.post(
  "/:id/assign",
  requirePermission("leads:assign") as any,
  validateParams(uuidParamSchema),
  validateBody(assignLeadSchema),
  asyncHandler(leadsController.assignLead) as RequestHandler,
);

router.get(
  "/:id/activities",
  validateParams(uuidParamSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(leadsController.getLeadActivities) as RequestHandler,
);

router.post(
  "/:id/activities",
  validateParams(uuidParamSchema),
  validateBody(createActivitySchema),
  checkResourceAccess("lead") as any,
  asyncHandler(leadsController.addLeadActivity) as RequestHandler,
);

router.patch(
  "/:id/status",
  validateParams(uuidParamSchema),
  validateBody(changeStatusSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(leadsController.updateLeadStatus) as RequestHandler,
);

router.get(
  "/:id/comments",
  validateParams(uuidParamSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(leadsController.getLeadComments) as RequestHandler,
);

router.post(
  "/:id/comments",
  validateParams(uuidParamSchema),
  validateBody(createCommentSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(leadsController.addLeadComment) as RequestHandler,
);

router.put(
  "/:id/comments/:commentId",
  requireAdmin as any,
  validateParams(leadCommentParamSchema),
  validateBody(updateCommentSchema),
  asyncHandler(leadsController.updateLeadComment) as RequestHandler,
);

router.delete(
  "/:id/comments/:commentId",
  requireAdmin as any,
  validateParams(leadCommentParamSchema),
  asyncHandler(leadsController.deleteLeadComment) as RequestHandler,
);

router.get(
  "/:id/reminders",
  validateParams(uuidParamSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(leadsController.getLeadReminders) as RequestHandler,
);

router.post(
  "/:id/reminders",
  validateParams(uuidParamSchema),
  validateBody(createLeadReminderSchema),
  checkResourceAccess("lead") as any,
  asyncHandler(leadsController.createLeadReminder) as RequestHandler,
);

router.delete(
  "/:id/reminders/:reminderId",
  validateParams(uuidParamSchema),
  asyncHandler(leadsController.deleteLeadReminder) as RequestHandler,
);

router.patch(
  "/reminders/:reminderId/done",
  asyncHandler(leadsController.markReminderDone) as RequestHandler,
);

export default router;

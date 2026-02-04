import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/authorization.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { z } from "zod";
import * as userEmailService from "../services/user-email.service.js";
import { sendSuccess, sendNoContent } from "../utils/responses.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

// Validation schemas
const saveEmailSettingsSchema = z.object({
  emailType: z.enum(["smtp", "gmail"]).default("smtp"),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.number().min(1).max(65535).default(587),
  smtpUser: z.string().email("Valid email address required"),
  smtpPassword: z.string().min(1, "Password is required"),
  smtpSecure: z.boolean().default(false),
});

const sendEmailSchema = z.object({
  to: z.string().email("Valid recipient email required"),
  toName: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  html: z.string().min(1, "Email body is required"),
  text: z.string().optional(),
  leadId: z.string().uuid().optional(),
});

const sendBulkEmailSchema = z.object({
  emails: z
    .array(
      z.object({
        to: z.string().email(),
        toName: z.string().optional(),
        subject: z.string().min(1),
        html: z.string().min(1),
        leadId: z.string().uuid().optional(),
      })
    )
    .min(1)
    .max(50, "Maximum 50 emails per batch"),
});

// ============================================
// USER OWN EMAIL SETTINGS ROUTES
// ============================================

/**
 * GET /email/settings
 * Get user's own email settings (without password)
 */
router.get(
  "/settings",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const settings = await userEmailService.getUserEmailSettings(
      authReq.user.id
    );

    sendSuccess(res, settings || { isConfigured: false });
  })
);

/**
 * POST /email/settings
 * Save user's own email settings
 */
router.post(
  "/settings",
  validateBody(saveEmailSettingsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const settings = await userEmailService.saveUserEmailSettings(
      authReq.user.id,
      req.body
    );

    sendSuccess(res, settings);
  })
);

/**
 * DELETE /email/settings
 * Remove user's own email settings
 */
router.delete(
  "/settings",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await userEmailService.deleteUserEmailSettings(authReq.user.id);

    sendNoContent(res);
  })
);

/**
 * POST /email/settings/test
 * Test user's own email configuration
 */
router.post(
  "/settings/test",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await userEmailService.testEmailConfiguration(
      authReq.user.id
    );

    sendSuccess(res, result);
  })
);

// ============================================
// ADMIN EMAIL SETTINGS ROUTES (for any user)
// ============================================

/**
 * GET /email/settings/user/:userId
 * Admin: Get any user's email settings
 */
router.get(
  "/settings/user/:userId",
  requireAdmin as any,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params["userId"] as string;
    const settings = await userEmailService.getUserEmailSettings(userId);

    sendSuccess(res, settings || { isConfigured: false });
  })
);

/**
 * POST /email/settings/user/:userId
 * Admin: Save any user's email settings
 */
router.post(
  "/settings/user/:userId",
  requireAdmin as any,
  validateBody(saveEmailSettingsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params["userId"] as string;
    const settings = await userEmailService.saveUserEmailSettings(
      userId,
      req.body
    );

    sendSuccess(res, settings);
  })
);

/**
 * DELETE /email/settings/user/:userId
 * Admin: Remove any user's email settings
 */
router.delete(
  "/settings/user/:userId",
  requireAdmin as any,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params["userId"] as string;
    await userEmailService.deleteUserEmailSettings(userId);

    sendNoContent(res);
  })
);

/**
 * POST /email/settings/user/:userId/test
 * Admin: Test any user's email configuration
 */
router.post(
  "/settings/user/:userId/test",
  requireAdmin as any,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params["userId"] as string;
    const result = await userEmailService.testEmailConfiguration(userId);

    sendSuccess(res, result);
  })
);

// ============================================
// EMAIL SENDING ROUTES
// ============================================

/**
 * POST /email/send
 * Send single email
 */
router.post(
  "/send",
  validateBody(sendEmailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await userEmailService.sendUserEmail(
      authReq.user.id,
      req.body
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: "EMAIL_SEND_FAILED", message: result.error },
      });
      return;
    }

    sendSuccess(res, { message: "Email sent successfully" });
  })
);

/**
 * POST /email/send-bulk
 * Send bulk emails (max 50)
 */
router.post(
  "/send-bulk",
  validateBody(sendBulkEmailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await userEmailService.sendBulkUserEmails(
      authReq.user.id,
      req.body.emails
    );

    sendSuccess(res, result);
  })
);

/**
 * GET /email/history
 * Get email send history
 */
router.get(
  "/history",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;
    const leadId = req.query["leadId"] as string;

    const history = await userEmailService.getEmailSendHistory(
      authReq.user.id,
      {
        limit,
        offset,
        leadId,
      }
    );

    sendSuccess(res, history);
  })
);

/**
 * GET /email/info
 * Get email feature info (limits, etc.)
 */
router.get(
  "/info",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const settings = await userEmailService.getUserEmailSettings(
      authReq.user.id
    );

    sendSuccess(res, {
      isConfigured: settings?.isConfigured || false,
      maxEmailsPerBatch: userEmailService.MAX_EMAILS_PER_BATCH,
      dailySentCount: settings?.dailySentCount || 0,
    });
  })
);

export default router;

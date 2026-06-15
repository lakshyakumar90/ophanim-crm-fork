import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireAdmin } from "../../../middleware/authorization.middleware.js";
import { validateBody } from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { z } from "zod";
import * as emailController from "./email.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

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
      }),
    )
    .min(1)
    .max(50, "Maximum 50 emails per batch"),
});

router.get("/settings", asyncHandler(emailController.getEmailSettings) as RequestHandler);

router.post(
  "/settings",
  validateBody(saveEmailSettingsSchema),
  asyncHandler(emailController.saveEmailSettings) as RequestHandler,
);

router.delete("/settings", asyncHandler(emailController.deleteEmailSettings) as RequestHandler);

router.post(
  "/settings/test",
  asyncHandler(emailController.testEmailSettings) as RequestHandler,
);

router.get(
  "/settings/user/:userId",
  requireAdmin as any,
  asyncHandler(emailController.getUserEmailSettings) as RequestHandler,
);

router.post(
  "/settings/user/:userId",
  requireAdmin as any,
  validateBody(saveEmailSettingsSchema),
  asyncHandler(emailController.saveUserEmailSettings) as RequestHandler,
);

router.delete(
  "/settings/user/:userId",
  requireAdmin as any,
  asyncHandler(emailController.deleteUserEmailSettings) as RequestHandler,
);

router.post(
  "/settings/user/:userId/test",
  requireAdmin as any,
  asyncHandler(emailController.testUserEmailSettings) as RequestHandler,
);

router.post(
  "/send",
  validateBody(sendEmailSchema),
  asyncHandler(emailController.sendEmail) as RequestHandler,
);

router.post(
  "/send-bulk",
  validateBody(sendBulkEmailSchema),
  asyncHandler(emailController.sendBulkEmail) as RequestHandler,
);

router.get("/history", asyncHandler(emailController.getEmailHistory) as RequestHandler);

router.get("/info", asyncHandler(emailController.getEmailInfo) as RequestHandler);

export default router;

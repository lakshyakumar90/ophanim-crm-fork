import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/authorization.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { authRateLimiter } from "../middleware/rate-limiter.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  otpChangePasswordSchema,
  verify2FASchema,
  login2FASchema,
  disable2FASchema,
} from "../validators/auth.validator.js";
import * as authService from "../services/auth.service.js";
import { sendSuccess, sendCreated, sendNoContent } from "../utils/responses.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: RouterType = Router();

/**
 * POST /auth/login
 * Login with email and password
 */
router.post(
  "/login",
  authRateLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    sendSuccess(res, result);
  })
);

/**
 * POST /auth/register
 * Register new user (admin only - for direct user creation)
 */
router.post(
  "/register",
  authenticate as any,
  requireAdmin as any,
  validateBody(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await authService.register(req.body, authReq.user.id);
    sendCreated(res, result);
  })
);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post(
  "/refresh",
  validateBody(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refreshAccessToken(req.body);
    sendSuccess(res, result);
  })
);

/**
 * POST /auth/logout
 * Logout current session
 */
router.post(
  "/logout",
  authenticate as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const refreshToken = req.body?.refreshToken;
    await authService.logout(authReq.user.id, refreshToken);
    sendNoContent(res);
  })
);

/**
 * POST /auth/change-password
 * Change current user's password
 */
router.post(
  "/change-password",
  authenticate as any,
  validateBody(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await authService.changePassword(authReq.user.id, req.body);
    sendSuccess(res, { message: "Password changed successfully" });
  })
);

/**
 * GET /auth/me
 * Get current user info
 */
router.get(
  "/me",
  authenticate as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const user = await authService.getCurrentUser(authReq.user.id);
    sendSuccess(res, user);
  })
);

/**
 * POST /auth/request-password-otp
 * Request OTP for password change
 */
router.post(
  "/request-password-otp",
  authenticate as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await authService.requestPasswordChangeOTP(authReq.user.id);
    sendSuccess(res, { message: "OTP sent to your email" });
  })
);

/**
 * POST /auth/verify-password-otp
 * Verify OTP and change password
 */
router.post(
  "/verify-password-otp",
  authenticate as any,
  validateBody(otpChangePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    // Assuming schema allows `otp`. Check validator. Or create new validator?
    // User service passes input directly. I should check if input includes otp.
    // Actually, create a composite input or just take from body.
    await authService.verifyOTPAndChangePassword(authReq.user.id, {
      ...req.body,
      otp: req.body.otp, // Ensure frontend sends otp
    });
    sendSuccess(res, { message: "Password changed successfully" });
  })
);

// ============================================
// 2FA Routes
// ============================================

/**
 * POST /auth/2fa/setup
 * Generate 2FA secret and QR code
 */
router.post(
  "/2fa/setup",
  authenticate as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await authService.setup2FA(authReq.user.id);
    sendSuccess(res, result);
  })
);

/**
 * POST /auth/2fa/verify
 * Verify 2FA code and enable 2FA
 */
router.post(
  "/2fa/verify",
  authenticate as any,
  validateBody(verify2FASchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await authService.verify2FASetup(
      authReq.user.id,
      req.body.token
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /auth/2fa/disable
 * Disable 2FA
 */
router.post(
  "/2fa/disable",
  authenticate as any,
  validateBody(disable2FASchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await authService.disable2FA(
      authReq.user.id,
      req.body.password,
      req.body.token
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /auth/login/2fa
 * Complete login with 2FA code
 */
router.post(
  "/login/2fa",
  authRateLimiter,
  validateBody(login2FASchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login2FA(req.body.userId, req.body.token);
    sendSuccess(res, result);
  })
);

export default router;

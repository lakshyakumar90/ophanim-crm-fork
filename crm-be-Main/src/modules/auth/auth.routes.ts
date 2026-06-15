import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireAdmin } from "../../../middleware/authorization.middleware.js";
import { validateBody } from "../../../middleware/validation.middleware.js";
import { authRateLimiter } from "../../../middleware/rate-limiter.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  otpChangePasswordSchema,
  verify2FASchema,
  login2FASchema,
  disable2FASchema,
} from "./auth.validator.js";
import * as authController from "./auth.controller.js";

const router: RouterType = Router();

router.post(
  "/login",
  authRateLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login) as RequestHandler,
);

router.post(
  "/register",
  authenticate as any,
  requireAdmin as any,
  validateBody(registerSchema),
  asyncHandler(authController.register) as RequestHandler,
);

router.post(
  "/refresh",
  validateBody(refreshTokenSchema),
  asyncHandler(authController.refresh) as RequestHandler,
);

router.post(
  "/logout",
  authenticate as any,
  asyncHandler(authController.logout) as RequestHandler,
);

router.post(
  "/change-password",
  authenticate as any,
  validateBody(changePasswordSchema),
  asyncHandler(authController.changePassword) as RequestHandler,
);

router.get(
  "/me",
  authenticate as any,
  asyncHandler(authController.getMe) as RequestHandler,
);

router.post(
  "/request-password-otp",
  authenticate as any,
  asyncHandler(authController.requestPasswordOtp) as RequestHandler,
);

router.post(
  "/verify-password-otp",
  authenticate as any,
  validateBody(otpChangePasswordSchema),
  asyncHandler(authController.verifyPasswordOtp) as RequestHandler,
);

router.post(
  "/2fa/setup",
  authenticate as any,
  asyncHandler(authController.setup2FA) as RequestHandler,
);

router.post(
  "/2fa/verify",
  authenticate as any,
  validateBody(verify2FASchema),
  asyncHandler(authController.verify2FA) as RequestHandler,
);

router.post(
  "/2fa/disable",
  authenticate as any,
  validateBody(disable2FASchema),
  asyncHandler(authController.disable2FA) as RequestHandler,
);

router.post(
  "/login/2fa",
  authRateLimiter,
  validateBody(login2FASchema),
  asyncHandler(authController.login2FA) as RequestHandler,
);

export default router;

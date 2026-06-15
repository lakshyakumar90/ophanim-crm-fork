import { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../types/api.types.js";
import * as authService from "./auth.service.js";
import { sendSuccess, sendCreated, sendNoContent } from "../../utils/responses.js";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await authService.register(req.body, authReq.user.id);
    sendCreated(res, result);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.refreshAccessToken(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const refreshToken = req.body?.refreshToken;
    await authService.logout(authReq.user.id, refreshToken);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    await authService.changePassword(authReq.user.id, req.body);
    sendSuccess(res, { message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const user = await authService.getCurrentUser(authReq.user.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const requestPasswordOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    await authService.requestPasswordChangeOTP(authReq.user.id);
    sendSuccess(res, { message: "OTP sent to your email" });
  } catch (error) {
    next(error);
  }
};

export const verifyPasswordOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    await authService.verifyOTPAndChangePassword(authReq.user.id, {
      ...req.body,
      otp: req.body.otp,
    });
    sendSuccess(res, { message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

export const setup2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await authService.setup2FA(authReq.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const verify2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await authService.verify2FASetup(authReq.user.id, req.body.token);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const disable2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await authService.disable2FA(
      authReq.user.id,
      req.body.password,
      req.body.token,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const login2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login2FA(req.body.userId, req.body.token);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as userEmailService from "./user-email.service.js";
import { sendSuccess, sendNoContent } from "../../../utils/responses.js";

export const getEmailSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const settings = await userEmailService.getUserEmailSettings(req.user.id);
    sendSuccess(res, settings || { isConfigured: false });
  } catch (error) {
    next(error);
  }
};

export const saveEmailSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const settings = await userEmailService.saveUserEmailSettings(
      req.user.id,
      req.body,
    );
    sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
};

export const deleteEmailSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await userEmailService.deleteUserEmailSettings(req.user.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const testEmailSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await userEmailService.testEmailConfiguration(req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getUserEmailSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.params["userId"] as string;
    const settings = await userEmailService.getUserEmailSettings(userId);
    sendSuccess(res, settings || { isConfigured: false });
  } catch (error) {
    next(error);
  }
};

export const saveUserEmailSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.params["userId"] as string;
    const settings = await userEmailService.saveUserEmailSettings(
      userId,
      req.body,
    );
    sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
};

export const deleteUserEmailSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.params["userId"] as string;
    await userEmailService.deleteUserEmailSettings(userId);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const testUserEmailSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.params["userId"] as string;
    const result = await userEmailService.testEmailConfiguration(userId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const sendEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await userEmailService.sendUserEmail(req.user.id, req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: "EMAIL_SEND_FAILED", message: result.error },
      });
      return;
    }

    sendSuccess(res, { message: "Email sent successfully" });
  } catch (error) {
    next(error);
  }
};

export const sendBulkEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await userEmailService.sendBulkUserEmails(
      req.user.id,
      req.body.emails,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getEmailHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;
    const leadId = req.query["leadId"] as string;

    const history = await userEmailService.getEmailSendHistory(req.user.id, {
      limit,
      offset,
      leadId,
    });

    sendSuccess(res, history);
  } catch (error) {
    next(error);
  }
};

export const getEmailInfo = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const settings = await userEmailService.getUserEmailSettings(req.user.id);

    sendSuccess(res, {
      isConfigured: settings?.isConfigured || false,
      maxEmailsPerBatch: userEmailService.MAX_EMAILS_PER_BATCH,
      dailySentCount: settings?.dailySentCount || 0,
    });
  } catch (error) {
    next(error);
  }
};

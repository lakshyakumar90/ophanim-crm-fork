import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import {
  sendSuccess,
  sendCreated,
  ApiError,
} from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import * as emailRequestService from "../services/email-request.service.js";

export const get_email_requests = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const filters = {
      status: req.query["status"] as string,
      email_type: req.query["email_type"] as string,
      sender_id: req.query["sender_id"] as string,
      invoice_id: req.query["invoice_id"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await emailRequestService.getEmailRequests(
      req.user.id,
      req.user.role,
      filters,
      { limit, offset },
    );

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const get_email_requests_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const emailRequest = await emailRequestService.getEmailRequestById(
      req.params["id"] as string,
    );
    sendSuccess(res, emailRequest);
  } catch (error) {
    next(error);
  }
};

export const post_email_requests = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const emailRequest = await emailRequestService.createEmailRequest(
      req.body,
      req.user.id,
    );
    sendCreated(res, emailRequest);
  } catch (error) {
    next(error);
  }
};

export const put_email_requests_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const emailRequest = await emailRequestService.updateEmailRequest(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendSuccess(res, emailRequest);
  } catch (error) {
    next(error);
  }
};

export const post_email_requests_id_submit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const emailRequest =
      await emailRequestService.submitEmailRequestForApproval(
        req.params["id"] as string,
        req.user.id,
      );
    sendSuccess(res, emailRequest);
  } catch (error) {
    next(error);
  }
};

export const post_email_requests_id_approve = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const emailRequest = await emailRequestService.approveEmailRequest(
      req.params["id"] as string,
      req.user.id,
    );
    sendSuccess(res, emailRequest);
  } catch (error) {
    next(error);
  }
};

export const post_email_requests_id_reject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const emailRequest = await emailRequestService.rejectEmailRequest(
      req.params["id"] as string,
      req.user.id,
      req.body.reason,
    );
    sendSuccess(res, emailRequest);
  } catch (error) {
    next(error);
  }
};

export const post_email_requests_id_send = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    // Get email request
    const emailRequest = await emailRequestService.getEmailRequestById(
      req.params["id"] as string,
    );

    if (!emailRequest) {
      throw new ApiError(ERROR_CODES.NOT_FOUND);
    }

    if (emailRequest.status !== "approved") {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Email must be approved before sending",
      );
    }

    if (
      emailRequest.sender_id !== req.user.id &&
      req.user.role === "employee"
    ) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only send your own emails",
      );
    }

    // Import user email service dynamically to avoid circular dependency
    const { sendUserEmail } = await import("../../operations/email/user-email.service.js");

    const result = await sendUserEmail(emailRequest.sender_id, {
      to: emailRequest.recipient_email,
      toName: emailRequest.recipient_name,
      subject: emailRequest.subject,
      html: emailRequest.body,
      leadId: emailRequest.lead_id,
    });

    if (result.success) {
      await emailRequestService.markEmailSent(req.params["id"] as string);
      sendSuccess(res, { message: "Email sent successfully" });
    } else {
      await emailRequestService.markEmailFailed(
        req.params["id"] as string,
        result.error || "Unknown error",
      );
      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        result.error || "Failed to send email",
      );
    }
  } catch (error) {
    next(error);
  }
};

export const post_email_requests_id_schedule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const scheduled = await emailRequestService.scheduleEmail(
      req.params["id"] as string,
      req.body.scheduled_for,
      req.user.id,
    );
    sendSuccess(res, scheduled);
  } catch (error) {
    next(error);
  }
};

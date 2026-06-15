import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as scheduledEmailService from "../services/scheduled-email.service.js";
import * as recurringService from "../services/recurring.service.js";
import * as invoiceService from "../services/invoice.service.js";

export const get_scheduled_emails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;
    const data = await scheduledEmailService.getUpcomingScheduledEmails({
      limit,
      offset,
    });
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const post_scheduled_emails_id_cancel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const data = await scheduledEmailService.cancelScheduledEmail(
      req.params["id"] as string,
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const post_scheduled_emails_id_reschedule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const data = await scheduledEmailService.rescheduleEmail(
      req.params["id"] as string,
      req.body.scheduled_for,
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const post_cron_process_scheduled_emails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const result = await scheduledEmailService.processScheduledEmails();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const post_cron_process_recurring_invoices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const result = await recurringService.processRecurringInvoices();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const post_cron_update_overdue = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const result = await invoiceService.updateOverdueInvoices();
    sendSuccess(res, { updated: result.length });
  } catch (error) {
    next(error);
  }
};

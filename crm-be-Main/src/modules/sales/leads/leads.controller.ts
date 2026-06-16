import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as leadsService from "./leads.service.js";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from "../../../utils/responses.js";
import { logger } from "../../../utils/logger.js";

export const getLeads = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await leadsService.getLeads(req.query as any, req.user);
    sendPaginated(res, result.data, result.meta);
  } catch (error) {
    next(error);
  }
};

export const getLeadPipeline = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const pipeline = await leadsService.getLeadPipeline(req.user);
    sendSuccess(res, pipeline);
  } catch (error) {
    next(error);
  }
};

export const getWonLeads = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const leads = await leadsService.getWonLeads(req.user);
    sendSuccess(res, leads);
  } catch (error) {
    next(error);
  }
};

export const getLeadCountsByUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const stats = await leadsService.getLeadCountsByUser(req.user);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

export const createLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lead = await leadsService.createLead(
      req.body,
      req.user.id,
      req.user.departmentId,
    );
    sendCreated(res, lead);
  } catch (error) {
    next(error);
  }
};

export const bulkAssignLeads = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await leadsService.bulkAssignLeads(req.body, req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateLeads = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await leadsService.bulkUpdateLeads(req.body, req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteLeads = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await leadsService.bulkDeleteLeads(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAllReminders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, userId, sortBy, sortOrder, status, date } =
      req.query as any;

    const query = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      userId,
      sortBy,
      sortOrder,
      status,
      date,
    };

    const result = await leadsService.getAllReminders(query, req.user);
    sendPaginated(res, result.data, result.meta);
  } catch (error) {
    next(error);
  }
};

export const getRemindersCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId, status, date } = req.query as any;

    const count = await leadsService.getRemindersCount(
      { userId, status, date },
      req.user,
    );

    sendSuccess(res, { count });
  } catch (error) {
    next(error);
  }
};

export const getLeadById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lead = await leadsService.getLeadById(req.params["id"] as string);
    sendSuccess(res, lead);
  } catch (error) {
    next(error);
  }
};

export const getLeadDetailPageData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const start = Date.now();
    const pageData = await leadsService.getLeadDetailPageData(
      req.params["id"] as string,
      req.user,
    );

    const durationMs = Date.now() - start;
    const payloadBytes = Buffer.byteLength(JSON.stringify(pageData), "utf8");
    res.setHeader("X-Lead-Page-Data-Time-Ms", String(durationMs));
    res.setHeader("X-Lead-Page-Data-Bytes", String(payloadBytes));

    logger.info(
      {
        route: "/api/v1/leads/:id/page-data",
        leadId: req.params["id"],
        userId: req.user.id,
        role: req.user.role,
        durationMs,
        payloadBytes,
      },
      "Lead page-data performance metrics",
    );

    sendSuccess(res, pageData);
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lead = await leadsService.updateLead(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendSuccess(res, lead);
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await leadsService.deleteLead(req.params["id"] as string);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const assignLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lead = await leadsService.assignLead(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendSuccess(res, lead);
  } catch (error) {
    next(error);
  }
};

export const getLeadActivities = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const activities = await leadsService.getLeadActivities(
      req.params["id"] as string,
    );
    sendSuccess(res, activities);
  } catch (error) {
    next(error);
  }
};

export const addLeadActivity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await leadsService.addLeadActivity(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendCreated(res, { message: "Activity added successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateLeadStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lead = await leadsService.updateLeadStatus(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendSuccess(res, lead);
  } catch (error) {
    next(error);
  }
};

export const getLeadComments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const comments = await leadsService.getLeadComments(
      req.params["id"] as string,
    );
    sendSuccess(res, comments);
  } catch (error) {
    next(error);
  }
};

export const addLeadComment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const comment = await leadsService.addLeadComment(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendCreated(res, comment);
  } catch (error) {
    next(error);
  }
};

export const updateLeadComment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const comment = await leadsService.updateLeadComment(
      req.params["commentId"] as string,
      req.body,
      req.user.id,
    );
    sendSuccess(res, comment);
  } catch (error) {
    next(error);
  }
};

export const deleteLeadComment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await leadsService.deleteLeadComment(req.params["commentId"] as string);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const getLeadReminders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const reminders = await leadsService.getLeadReminders(
      req.params["id"] as string,
      req.user,
    );
    sendSuccess(res, reminders);
  } catch (error) {
    next(error);
  }
};

export const createLeadReminder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reminderAt, note } = req.body;
    const reminder = await leadsService.createLeadReminder(
      req.params["id"] as string,
      req.user.id,
      reminderAt,
      note,
    );
    sendCreated(res, reminder);
  } catch (error) {
    next(error);
  }
};

export const deleteLeadReminder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await leadsService.deleteLeadReminder(
      req.params["reminderId"] as string,
      req.user,
    );
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const getLeadConversionStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { getLeadConversionStatus: getStatus } = await import(
      "./leads-convert.service.js"
    );
    const status = await getStatus(req.params["id"] as string);
    sendSuccess(res, status);
  } catch (error) {
    next(error);
  }
};

export const convertLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { convertLead: convert } = await import("./leads-convert.service.js");
    const result = await convert(
      req.params["id"] as string,
      req.body,
      req.user,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const markReminderDone = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const reminder = await leadsService.markReminderDone(
      req.params["reminderId"] as string,
      req.user,
    );
    sendSuccess(res, reminder);
  } catch (error) {
    next(error);
  }
};

import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as timelineService from "./timeline.service.js";

export const getTimeline = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = (req.params.projectId || req.params.id) as string;
    const timeline = await timelineService.getProjectTimeline(
      projectId,
      req.user,
    );
    sendSuccess(res, timeline);
  } catch (error) {
    next(error);
  }
};

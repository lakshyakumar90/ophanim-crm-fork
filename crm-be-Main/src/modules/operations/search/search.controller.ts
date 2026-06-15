import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { searchGlobal } from "./search.service.js";
import { sendSuccess } from "../../../utils/responses.js";

export const search = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as string;
    const duration = req.query.duration as string;

    if (!query) {
      sendSuccess(res, []);
      return;
    }

    const results = await searchGlobal(query, req.user, { type, duration });
    sendSuccess(res, results);
  } catch (error) {
    next(error);
  }
};

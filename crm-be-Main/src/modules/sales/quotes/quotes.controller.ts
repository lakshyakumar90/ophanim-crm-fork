import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as quotesService from "./quotes.service.js";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from "../../../utils/responses.js";

export const getQuotes = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await quotesService.getQuotes(req.query as any, req.user);
    sendPaginated(res, result.data, result.meta);
  } catch (error) {
    next(error);
  }
};

export const getQuoteById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const quote = await quotesService.getQuoteById(
      req.params["id"] as string,
      req.user,
    );
    sendSuccess(res, quote);
  } catch (error) {
    next(error);
  }
};

export const createQuote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const quote = await quotesService.createQuote(
      req.body,
      req.user.id,
      req.user.departmentId,
    );
    sendCreated(res, quote);
  } catch (error) {
    next(error);
  }
};

export const updateQuote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const quote = await quotesService.updateQuote(
      req.params["id"] as string,
      req.body,
      req.user,
    );
    sendSuccess(res, quote);
  } catch (error) {
    next(error);
  }
};

export const deleteQuote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await quotesService.deleteQuote(req.params["id"] as string, req.user);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const sendQuote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const quote = await quotesService.sendQuote(
      req.params["id"] as string,
      req.user,
    );
    sendSuccess(res, quote);
  } catch (error) {
    next(error);
  }
};

export const acceptQuote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const quote = await quotesService.acceptQuote(
      req.params["id"] as string,
      req.user,
    );
    sendSuccess(res, quote);
  } catch (error) {
    next(error);
  }
};

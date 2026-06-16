import { Response, NextFunction, Request } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess, sendCreated } from "../../../utils/responses.js";
import * as portalService from "./portal.service.js";
import { createPortalTokenSchema } from "./portal.validator.js";

export const createToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = createPortalTokenSchema.parse(req.body);
    const token = await portalService.createProjectPortalToken(
      req.params.projectId as string,
      req.user,
      input.expiresInDays,
    );
    sendCreated(res, token);
  } catch (error) {
    next(error);
  }
};

export const listTokens = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tokens = await portalService.listProjectPortalTokens(
      req.params.projectId as string,
      req.user,
    );
    sendSuccess(res, tokens);
  } catch (error) {
    next(error);
  }
};

export const revokeToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = await portalService.revokeProjectPortalToken(
      req.params.tokenId as string,
      req.user,
    );
    sendSuccess(res, token);
  } catch (error) {
    next(error);
  }
};

export const getPublicProjectStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await portalService.getProjectStatusByPortalToken(
      req.params.token as string,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

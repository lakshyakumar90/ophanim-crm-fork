import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as assetsService from "./assets.service.js";

export const listAssets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const assets = await assetsService.listAssets(req.query as any);
    sendSuccess(res, assets);
  } catch (error) {
    next(error);
  }
};

export const getAssetById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const asset = await assetsService.getAssetById(req.params.id as string);
    sendSuccess(res, asset);
  } catch (error) {
    next(error);
  }
};

export const createAsset = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const asset = await assetsService.createAsset(req.body, req.user.id);
    sendSuccess(res, asset, 201);
  } catch (error) {
    next(error);
  }
};

export const updateAsset = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const asset = await assetsService.updateAsset(
      req.params.id as string,
      req.body,
    );
    sendSuccess(res, asset);
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await assetsService.deleteAsset(req.params.id as string);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
};

export const assignAsset = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user_id, notes } = req.body as { user_id: string; notes?: string };
    const result = await assetsService.assignAsset(
      req.params.id as string,
      user_id,
      req.user.id,
      notes,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const returnAsset = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await assetsService.returnAsset(req.params.id as string);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const listAssignments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const assignments = await assetsService.listAssignments(req.query as any);
    sendSuccess(res, assignments);
  } catch (error) {
    next(error);
  }
};

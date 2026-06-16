import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as skillsService from "./skills.service.js";

export const listSkills = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const skills = await skillsService.listSkills(req.query as any);
    sendSuccess(res, skills);
  } catch (error) {
    next(error);
  }
};

export const getSkillById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const skill = await skillsService.getSkillById(req.params.id as string);
    sendSuccess(res, skill);
  } catch (error) {
    next(error);
  }
};

export const createSkill = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const skill = await skillsService.createSkill(req.body);
    sendSuccess(res, skill, 201);
  } catch (error) {
    next(error);
  }
};

export const updateSkill = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const skill = await skillsService.updateSkill(req.params.id as string, req.body);
    sendSuccess(res, skill);
  } catch (error) {
    next(error);
  }
};

export const deleteSkill = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await skillsService.deleteSkill(req.params.id as string);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
};

export const getSkillsMatrix = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const matrix = await skillsService.getSkillsMatrix(req.query as any);
    sendSuccess(res, matrix);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeSkills = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const skills = await skillsService.getEmployeeSkills(req.params.userId as string);
    sendSuccess(res, skills);
  } catch (error) {
    next(error);
  }
};

export const upsertEmployeeSkill = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const record = await skillsService.upsertEmployeeSkill(
      req.params.userId as string,
      req.body,
    );
    sendSuccess(res, record, 201);
  } catch (error) {
    next(error);
  }
};

export const updateEmployeeSkill = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const record = await skillsService.updateEmployeeSkill(
      req.params.userId as string,
      req.params.skillId as string,
      req.body,
    );
    sendSuccess(res, record);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployeeSkill = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await skillsService.deleteEmployeeSkill(
      req.params.userId as string,
      req.params.skillId as string,
    );
    sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
};

import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as benefitsService from "./benefits.service.js";

export const listBenefitPlans = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plans = await benefitsService.listBenefitPlans(req.query as any);
    sendSuccess(res, plans);
  } catch (error) {
    next(error);
  }
};

export const getBenefitPlanById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plan = await benefitsService.getBenefitPlanById(req.params.id as string);
    sendSuccess(res, plan);
  } catch (error) {
    next(error);
  }
};

export const createBenefitPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plan = await benefitsService.createBenefitPlan(req.body, req.user.id);
    sendSuccess(res, plan, 201);
  } catch (error) {
    next(error);
  }
};

export const updateBenefitPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plan = await benefitsService.updateBenefitPlan(
      req.params.id as string,
      req.body,
    );
    sendSuccess(res, plan);
  } catch (error) {
    next(error);
  }
};

export const deleteBenefitPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await benefitsService.deleteBenefitPlan(req.params.id as string);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
};

export const listEnrollments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const enrollments = await benefitsService.listEnrollments(req.query as any);
    sendSuccess(res, enrollments);
  } catch (error) {
    next(error);
  }
};

export const getEnrollmentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const enrollment = await benefitsService.getEnrollmentById(req.params.id as string);
    sendSuccess(res, enrollment);
  } catch (error) {
    next(error);
  }
};

export const createEnrollment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const enrollment = await benefitsService.createEnrollment(req.body, req.user.id);
    sendSuccess(res, enrollment, 201);
  } catch (error) {
    next(error);
  }
};

export const updateEnrollment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const enrollment = await benefitsService.updateEnrollment(
      req.params.id as string,
      req.body,
    );
    sendSuccess(res, enrollment);
  } catch (error) {
    next(error);
  }
};

export const getMyEnrollments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const enrollments = await benefitsService.getMyEnrollments(req.user.id);
    sendSuccess(res, enrollments);
  } catch (error) {
    next(error);
  }
};

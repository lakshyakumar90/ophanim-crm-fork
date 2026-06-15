import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as departmentsService from "./departments.service.js";
import { sendSuccess, sendCreated, ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";

export const getDepartments = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const departments = await departmentsService.getDepartments();
    sendSuccess(res, departments);
  } catch (error) {
    next(error);
  }
};

export const getDepartmentBySlug = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { slug } = req.params;
    const department = await departmentsService.getDepartmentBySlug(
      slug as string,
    );

    if (!department) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "Department not found");
    }

    sendSuccess(res, department);
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const department = await departmentsService.getDepartmentById(id as string);

    if (!department) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "Department not found");
    }

    sendSuccess(res, department);
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, slug, description, icon, color } = req.body;

    const department = await departmentsService.createDepartment({
      name,
      slug,
      description,
      icon,
      color,
    });

    sendCreated(res, department);
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, isActive } = req.body;

    const department = await departmentsService.updateDepartment(id as string, {
      name,
      description,
      icon,
      color,
      isActive,
    });

    sendSuccess(res, department);
  } catch (error) {
    next(error);
  }
};

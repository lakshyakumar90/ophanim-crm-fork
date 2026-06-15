import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as usersService from "./users.service.js";
import {
  EMPLOYEE_JOB_TITLES,
  MANAGER_JOB_TITLES,
  JOB_TITLES,
} from "../users/users.validator.js";
import {
  ApiError,
  sendSuccess,
  sendPaginated,
} from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";

const DEPARTMENT_JOB_TITLES: Record<
  string,
  { employee: string[]; manager: string[] }
> = {
  sales: {
    employee: ["sales_employee"],
    manager: ["sales_manager"],
  },
  hr: {
    employee: ["hr_employee"],
    manager: ["hr_manager", "hr_director"],
  },
  finance: {
    employee: ["finance_employee"],
    manager: ["finance_manager"],
  },
  "project-management": {
    employee: ["developer", "designer", "content_writer", "seo_specialist"],
    manager: ["project_manager"],
  },
};

const formatTitle = (title: string) => ({
  value: title,
  label: title.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
});

export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await usersService.getUsers(req.query as any, req.user);
    sendPaginated(res, result.data, result.meta);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await usersService.getUserById(req.user.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await usersService.updateProfile(req.user.id, req.body);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const updateMyPreferences = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await usersService.updateProfile(req.user.id, req.body);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const file = (req as AuthenticatedRequest & { file?: Express.Multer.File })
      .file;
    if (!file) {
      throw new ApiError(ERROR_CODES.MISSING_REQUIRED_FIELD, "No file uploaded");
    }

    const fileExt = file.originalname.split(".").pop();
    const fileName = `${req.user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await usersService.supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new ApiError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        `Failed to upload avatar: ${uploadError.message}`,
      );
    }

    const {
      data: { publicUrl },
    } = usersService.supabaseAdmin.storage.from("avatars").getPublicUrl(filePath);

    const user = await usersService.updateProfile(req.user.id, {
      avatarUrl: publicUrl,
    });

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const getMyTeam = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const members = await usersService.getTeamMembersForManager(
      req.user.id,
      req.user.teamId,
    );
    sendSuccess(res, members);
  } catch (error) {
    next(error);
  }
};

export const getJobTitles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roleType = req.query["roleType"] as string | undefined;
    const departmentSlug = req.query["department"] as string | undefined;

    if (departmentSlug) {
      const deptConfig = DEPARTMENT_JOB_TITLES[departmentSlug];
      if (!deptConfig) {
        sendSuccess(res, { employee: [], manager: [], all: [] });
        return;
      }

      const employeeTitles = deptConfig.employee.map(formatTitle);
      const managerTitles = deptConfig.manager.map(formatTitle);

      if (roleType === "employee") {
        sendSuccess(res, {
          employee: employeeTitles,
          manager: [],
          all: employeeTitles,
        });
      } else if (roleType === "manager") {
        sendSuccess(res, {
          employee: [],
          manager: managerTitles,
          all: managerTitles,
        });
      } else {
        sendSuccess(res, {
          employee: employeeTitles,
          manager: managerTitles,
          all: [...employeeTitles, ...managerTitles],
        });
      }
      return;
    }

    let titles: readonly string[];
    if (roleType === "employee") {
      titles = EMPLOYEE_JOB_TITLES;
    } else if (roleType === "manager") {
      titles = MANAGER_JOB_TITLES;
    } else {
      titles = JOB_TITLES;
    }

    const formattedTitles = titles.map(formatTitle);

    sendSuccess(res, {
      employee: EMPLOYEE_JOB_TITLES.map(formatTitle),
      manager: MANAGER_JOB_TITLES.map(formatTitle),
      all: formattedTitles,
      byDepartment: DEPARTMENT_JOB_TITLES,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectManagers = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const managers = await usersService.getProjectManagers();
    sendSuccess(res, managers);
  } catch (error) {
    next(error);
  }
};

export const getUsersByJobTitle = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const titlesParam = req.query["titles"] as string;
    if (!titlesParam) {
      sendSuccess(res, []);
      return;
    }
    const titles = titlesParam.split(",").map((t) => t.trim());
    const users = await usersService.getUsersByJobTitles(titles);
    sendSuccess(res, users);
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await usersService.bulkUpdateUsers(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await usersService.getUserById(req.params["id"] as string);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await usersService.updateUser(
      req.params["id"] as string,
      req.body,
    );
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const activateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await usersService.activateUser(req.params["id"] as string);
    sendSuccess(res, { message: "User activated successfully" });
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await usersService.deactivateUser(req.params["id"] as string);
    sendSuccess(res, { message: "User deactivated successfully" });
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { newPassword } = req.body;
    const authService = await import("../../auth/auth.service.js");
    await authService.adminResetPassword(
      req.params["id"] as string,
      newPassword,
    );
    sendSuccess(res, { message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};

export const getTeamMembers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const members = await usersService.getTeamMembers(
      req.params["teamId"] as string,
    );
    sendSuccess(res, members);
  } catch (error) {
    next(error);
  }
};

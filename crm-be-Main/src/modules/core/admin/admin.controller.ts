import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as attendanceService from "../../operations/attendance/attendance.service.js";
import { sendSuccess, ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";

export const restoreAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const attendanceId = req.params["attendanceId"] as string;

    if (
      !attendanceId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        attendanceId,
      )
    ) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid attendance ID format",
      );
    }

    const restored = await attendanceService.restoreAttendanceByAdmin(
      attendanceId,
      req.user.id,
    );
    sendSuccess(res, restored);
  } catch (error) {
    next(error);
  }
};

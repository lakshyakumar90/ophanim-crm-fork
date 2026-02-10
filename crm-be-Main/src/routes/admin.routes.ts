import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/authorization.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sendSuccess } from "../utils/responses.js";
import type { AuthenticatedRequest } from "../types/api.types.js";
import * as attendanceService from "../services/attendance.service.js";

const router: Router = Router();

router.use(authenticate as any);
router.use(requireAdmin as any);

/**
 * POST /admin/restore-attendance/:attendanceId
 * Restore accidentally logged-out attendance session without extending shift.
 */
router.post(
  "/restore-attendance/:attendanceId",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const attendanceId = req.params["attendanceId"] as string;

    if (
      !attendanceId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        attendanceId,
      )
    ) {
      throw new Error("Invalid attendance ID format");
    }

    const restored = await attendanceService.restoreAttendanceByAdmin(
      attendanceId,
      authReq.user.id,
    );
    sendSuccess(res, restored);
  }),
);

export default router;


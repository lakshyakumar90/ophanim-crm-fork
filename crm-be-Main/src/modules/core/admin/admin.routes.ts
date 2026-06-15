import { Router, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireAdmin } from "../../../middleware/authorization.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as adminController from "./admin.controller.js";

const router: Router = Router();

router.use(authenticate as any);
router.use(requireAdmin as any);

router.post(
  "/restore-attendance/:attendanceId",
  asyncHandler(adminController.restoreAttendance) as RequestHandler,
);

export default router;

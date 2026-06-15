import { Router, type RequestHandler } from "express";
import { config } from "../../../config/env.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as cronController from "./cron.controller.js";

const router: Router = Router();

router.use((_req, res, next): void => {
  if (!config.cron.enableHttpCron) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
});

router.get("/reminders", asyncHandler(cronController.processReminders) as RequestHandler);

router.post("/auto-logout", asyncHandler(cronController.autoLogout) as RequestHandler);

router.get(
  "/auto-logout/status",
  asyncHandler(cronController.getAutoLogoutStatus) as RequestHandler,
);

router.post(
  "/compliance-checks",
  asyncHandler(cronController.complianceChecks) as RequestHandler,
);

export default router;

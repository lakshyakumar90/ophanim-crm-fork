import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requirePermission,
  requireAnyPermission,
  excludeDepartment,
} from "../../../middleware/authorization.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as timeController from "./time.controller.js";

const router: RouterType = Router();

const viewTimesheets = requirePermission("timesheets:view") as RequestHandler;
const manageTimesheets = requirePermission("timesheets:manage") as RequestHandler;
const approveTimesheets = requirePermission("timesheets:approve") as RequestHandler;
const viewOrManage = requireAnyPermission([
  "timesheets:view",
  "timesheets:manage",
]) as RequestHandler;

router.use(authenticate as any);
router.use(excludeDepartment("sales", "finance") as any);

router.get("/", viewOrManage, asyncHandler(timeController.list) as RequestHandler);
router.post("/", manageTimesheets, asyncHandler(timeController.create) as RequestHandler);
router.get("/:id", viewTimesheets, asyncHandler(timeController.getById) as RequestHandler);
router.put("/:id", manageTimesheets, asyncHandler(timeController.update) as RequestHandler);
router.delete("/:id", manageTimesheets, asyncHandler(timeController.remove) as RequestHandler);
router.post("/:id/submit", manageTimesheets, asyncHandler(timeController.submit) as RequestHandler);
router.post("/:id/approve", approveTimesheets, asyncHandler(timeController.approve) as RequestHandler);
router.post("/:id/reject", approveTimesheets, asyncHandler(timeController.reject) as RequestHandler);

export default router;

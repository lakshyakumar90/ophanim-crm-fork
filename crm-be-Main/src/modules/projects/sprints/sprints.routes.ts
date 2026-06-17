import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requirePermission,
  excludeDepartment,
  requireProjectViewAccess,
} from "../../../middleware/authorization.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as sprintsController from "./sprints.controller.js";

const router: RouterType = Router({ mergeParams: true });

const viewProjects = requireProjectViewAccess() as RequestHandler;
const editProjects = requirePermission("projects:edit") as RequestHandler;

router.use(authenticate as any);
router.use(excludeDepartment("sales", "finance") as any);

router.get("/", viewProjects, asyncHandler(sprintsController.list) as RequestHandler);
router.post("/", editProjects, asyncHandler(sprintsController.create) as RequestHandler);
router.get(
  "/:sprintId",
  viewProjects,
  asyncHandler(sprintsController.getById) as RequestHandler,
);
router.put(
  "/:sprintId",
  editProjects,
  asyncHandler(sprintsController.update) as RequestHandler,
);
router.delete(
  "/:sprintId",
  editProjects,
  asyncHandler(sprintsController.remove) as RequestHandler,
);

export default router;

import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requirePermission,
  excludeDepartment,
} from "../../../middleware/authorization.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as portalController from "./portal.controller.js";

const router: RouterType = Router({ mergeParams: true });

const editProjects = requirePermission("projects:edit") as RequestHandler;

router.use(authenticate as any);
router.use(excludeDepartment("sales", "finance") as any);

router.post("/tokens", editProjects, asyncHandler(portalController.createToken) as RequestHandler);
router.get("/tokens", editProjects, asyncHandler(portalController.listTokens) as RequestHandler);
router.delete(
  "/tokens/:tokenId",
  editProjects,
  asyncHandler(portalController.revokeToken) as RequestHandler,
);

export default router;

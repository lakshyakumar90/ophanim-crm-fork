import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorization.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as rolesController from "./roles.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get("/", asyncHandler(rolesController.listRoles) as RequestHandler);

router.get("/:id", asyncHandler(rolesController.getRoleById) as RequestHandler);

router.post(
  "/",
  requirePermission("roles:manage") as any,
  asyncHandler(rolesController.createRole) as RequestHandler,
);

router.put(
  "/:id",
  requirePermission("roles:manage") as any,
  asyncHandler(rolesController.updateRole) as RequestHandler,
);

router.delete(
  "/:id",
  requirePermission("roles:manage") as any,
  asyncHandler(rolesController.deleteRole) as RequestHandler,
);

router.get(
  "/users/:userId/roles",
  asyncHandler(rolesController.getUserRoles) as RequestHandler,
);

router.post(
  "/users/:userId/roles",
  requirePermission("crm:admin") as any,
  asyncHandler(rolesController.assignUserRole) as RequestHandler,
);

router.delete(
  "/users/:userId/roles/:roleId",
  requirePermission("crm:admin") as any,
  asyncHandler(rolesController.removeUserRole) as RequestHandler,
);

export default router;

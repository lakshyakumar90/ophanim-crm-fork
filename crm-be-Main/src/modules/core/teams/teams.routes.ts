import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireAdmin } from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import {
  createTeamSchema,
  updateTeamSchema,
  addUserToTeamSchema,
} from "./teams.validator.js";
import { uuidParamSchema } from "../users/users.validator.js";
import * as teamsController from "./teams.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get("/", asyncHandler(teamsController.getTeams) as RequestHandler);

router.get(
  "/:id",
  validateParams(uuidParamSchema),
  asyncHandler(teamsController.getTeamById) as RequestHandler,
);

router.get(
  "/:id/members",
  validateParams(uuidParamSchema),
  asyncHandler(teamsController.getTeamMembers) as RequestHandler,
);

router.post(
  "/",
  requireAdmin as any,
  validateBody(createTeamSchema),
  asyncHandler(teamsController.createTeam) as RequestHandler,
);

router.put(
  "/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(updateTeamSchema),
  asyncHandler(teamsController.updateTeam) as RequestHandler,
);

router.delete(
  "/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  asyncHandler(teamsController.deleteTeam) as RequestHandler,
);

router.post(
  "/:id/members",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(addUserToTeamSchema),
  asyncHandler(teamsController.addUserToTeam) as RequestHandler,
);

router.delete(
  "/:id/members/:userId",
  requireAdmin as any,
  asyncHandler(teamsController.removeUserFromTeam) as RequestHandler,
);

export default router;

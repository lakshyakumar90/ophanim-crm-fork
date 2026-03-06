import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  createTeamSchema,
  updateTeamSchema,
  addUserToTeamSchema,
} from "../validators/teams.validator.js";
import { uuidParamSchema } from "../validators/users.validator.js";
import * as teamsService from "../services/teams.service.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { ApiError } from "../utils/responses.js";
import { sendSuccess, sendCreated, sendNoContent } from "../utils/responses.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /teams
 * Get teams visible to the current user
 * - Employees: See only their own team
 * - Managers: See teams they manage
 * - Admins: See all teams
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const teams = await teamsService.getTeamsForUser(authReq.user);
    sendSuccess(res, teams);
  }),
);

/**
 * GET /teams/:id
 * Get team by ID
 * - Admins: any team
 * - Managers: teams they manage
 * - Employees: only own team
 */
router.get(
  "/:id",
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const teamId = req.params["id"] as string;

    // Get team first to check if user is the manager
    const team = await teamsService.getTeamById(teamId);

    // Check access based on role
    const isAdmin = authReq.user.role === "admin";
    const isTeamManager = team.managerId === authReq.user.id;
    const isOwnTeam = authReq.user.teamId === teamId;

    if (!isAdmin && !isTeamManager && !isOwnTeam) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only view your own team or teams you manage",
      );
    }

    sendSuccess(res, team);
  }),
);

/**
 * GET /teams/:id/members
 * Get team members (admin: any team, others: only own team)
 */
router.get(
  "/:id/members",
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const teamId = req.params["id"] as string;

    // Check access: admin can see any team, others only their own team
    if (authReq.user.role !== "admin" && authReq.user.teamId !== teamId) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only view your own team members",
      );
    }

    const members = await teamsService.getTeamMembersWithDetails(teamId);
    sendSuccess(res, members);
  }),
);

/**
 * POST /teams
 * Create new team (admin only)
 */
router.post(
  "/",
  requireAdmin as any,
  validateBody(createTeamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const team = await teamsService.createTeam(req.body);
    sendCreated(res, team);
  }),
);

/**
 * PUT /teams/:id
 * Update team (admin only)
 */
router.put(
  "/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(updateTeamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const team = await teamsService.updateTeam(
      req.params["id"] as string,
      req.body,
    );
    sendSuccess(res, team);
  }),
);

/**
 * DELETE /teams/:id
 * Delete team (admin only)
 */
router.delete(
  "/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await teamsService.deleteTeam(req.params["id"] as string);
    sendNoContent(res);
  }),
);

/**
 * POST /teams/:id/members
 * Add user to team (admin only)
 */
router.post(
  "/:id/members",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(addUserToTeamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await teamsService.addUserToTeam(
      req.params["id"] as string,
      req.body.userId,
    );
    sendSuccess(res, { message: "User added to team successfully" });
  }),
);

/**
 * DELETE /teams/:id/members/:userId
 * Remove user from team (admin only)
 */
router.delete(
  "/:id/members/:userId",
  requireAdmin as any,
  asyncHandler(async (req: Request, res: Response) => {
    await teamsService.removeUserFromTeam(req.params["userId"] as string);
    sendSuccess(res, { message: "User removed from team successfully" });
  }),
);

export default router;

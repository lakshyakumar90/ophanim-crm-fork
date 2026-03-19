import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  createTeamNoteSchema,
  updateTeamNoteSchema,
} from "../validators/team-notes.validator.js";
import { uuidParamSchema } from "../validators/users.validator.js";
import * as teamNotesService from "../services/team-notes.service.js";
import * as teamsService from "../services/teams.service.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { ApiError } from "../utils/responses.js";
import { sendSuccess, sendCreated, sendNoContent } from "../utils/responses.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: RouterType = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /teams/:teamId/notes
 * List notes for a team
 */
router.get(
  "/:teamId/notes",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const teamId = req.params["teamId"] as string;

    // Check access: Admin or Team Member
    if (authReq.user.role !== "admin" && authReq.user.teamId !== teamId) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only view notes for your own team",
      );
    }

    const notes = await teamNotesService.getTeamNotes(teamId);
    sendSuccess(res, notes);
  }),
);

/**
 * POST /teams/:teamId/notes
 * Create a note
 */
router.post(
  "/:teamId/notes",
  validateBody(createTeamNoteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const teamId = req.params["teamId"] as string;
    const { content } = req.body;

    // Check access: Admin or Team Member
    if (authReq.user.role !== "admin" && authReq.user.teamId !== teamId) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only post notes in your own team",
      );
    }

    const note = await teamNotesService.createTeamNote(
      teamId,
      authReq.user.id,
      content,
    );
    sendCreated(res, note);
  }),
);

/**
 * PUT /notes/:id
 * Update a note (Admin only)
 */
router.put(
  "/notes/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(updateTeamNoteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params["id"] as string;
    const { content } = req.body;
    const note = await teamNotesService.updateTeamNote(noteId, content);
    sendSuccess(res, note);
  }),
);

/**
 * DELETE /notes/:id
 * Delete a note (Admin only)
 */
router.delete(
  "/notes/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params["id"] as string;
    await teamNotesService.deleteTeamNote(noteId);
    sendNoContent(res);
  }),
);

/**
 * POST /notes/:noteId/pin
 * Pin a team note
 */
router.post(
  "/notes/:noteId/pin",
  asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params["noteId"] as string;
    const note = await teamNotesService.pinTeamNote(noteId);
    sendSuccess(res, note);
  })
);

/**
 * POST /notes/:noteId/unpin
 * Unpin a team note
 */
router.post(
  "/notes/:noteId/unpin",
  asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params["noteId"] as string;
    const note = await teamNotesService.unpinTeamNote(noteId);
    sendSuccess(res, note);
  })
);

export default router;

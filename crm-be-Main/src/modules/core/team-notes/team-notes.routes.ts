import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireAdmin } from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import {
  createTeamNoteSchema,
  updateTeamNoteSchema,
} from "./team-notes.validator.js";
import { uuidParamSchema } from "../users/users.validator.js";
import * as teamNotesController from "./team-notes.controller.js";

const router: RouterType = Router({ mergeParams: true });

router.use(authenticate as any);

router.get(
  "/:teamId/notes",
  asyncHandler(teamNotesController.getTeamNotes) as RequestHandler,
);

router.post(
  "/:teamId/notes",
  validateBody(createTeamNoteSchema),
  asyncHandler(teamNotesController.createTeamNote) as RequestHandler,
);

router.put(
  "/notes/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(updateTeamNoteSchema),
  asyncHandler(teamNotesController.updateTeamNote) as RequestHandler,
);

router.delete(
  "/notes/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  asyncHandler(teamNotesController.deleteTeamNote) as RequestHandler,
);

router.post(
  "/notes/:noteId/pin",
  asyncHandler(teamNotesController.pinTeamNote) as RequestHandler,
);

router.post(
  "/notes/:noteId/unpin",
  asyncHandler(teamNotesController.unpinTeamNote) as RequestHandler,
);

export default router;

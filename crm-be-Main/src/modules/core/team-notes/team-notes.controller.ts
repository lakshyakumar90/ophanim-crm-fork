import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as teamNotesService from "./team-notes.service.js";
import {
  ApiError,
  sendSuccess,
  sendCreated,
  sendNoContent,
} from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";

export const getTeamNotes = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const teamId = req.params["teamId"] as string;

    if (req.user.role !== "admin" && req.user.teamId !== teamId) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only view notes for your own team",
      );
    }

    const notes = await teamNotesService.getTeamNotes(teamId);
    sendSuccess(res, notes);
  } catch (error) {
    next(error);
  }
};

export const createTeamNote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const teamId = req.params["teamId"] as string;
    const { content } = req.body;

    if (req.user.role !== "admin" && req.user.teamId !== teamId) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only post notes in your own team",
      );
    }

    const note = await teamNotesService.createTeamNote(
      teamId,
      req.user.id,
      content,
    );
    sendCreated(res, note);
  } catch (error) {
    next(error);
  }
};

export const updateTeamNote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const noteId = req.params["id"] as string;
    const { content } = req.body;
    const note = await teamNotesService.updateTeamNote(noteId, content);
    sendSuccess(res, note);
  } catch (error) {
    next(error);
  }
};

export const deleteTeamNote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const noteId = req.params["id"] as string;
    await teamNotesService.deleteTeamNote(noteId);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const pinTeamNote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const noteId = req.params["noteId"] as string;
    const note = await teamNotesService.pinTeamNote(noteId);
    sendSuccess(res, note);
  } catch (error) {
    next(error);
  }
};

export const unpinTeamNote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const noteId = req.params["noteId"] as string;
    const note = await teamNotesService.unpinTeamNote(noteId);
    sendSuccess(res, note);
  } catch (error) {
    next(error);
  }
};

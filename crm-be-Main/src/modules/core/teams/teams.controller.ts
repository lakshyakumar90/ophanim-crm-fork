import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import * as teamsService from "./teams.service.js";
import {
  ApiError,
  sendSuccess,
  sendCreated,
  sendNoContent,
} from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";

export const getTeams = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const teams = await teamsService.getTeamsForUser(req.user);
    sendSuccess(res, teams);
  } catch (error) {
    next(error);
  }
};

export const getTeamById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const teamId = req.params["id"] as string;
    const team = await teamsService.getTeamById(teamId);

    const isAdmin = req.user.role === "admin";
    const isTeamManager = team.managerId === req.user.id;
    const isOwnTeam = req.user.teamId === teamId;

    if (!isAdmin && !isTeamManager && !isOwnTeam) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only view your own team or teams you manage",
      );
    }

    sendSuccess(res, team);
  } catch (error) {
    next(error);
  }
};

export const getTeamMembers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const teamId = req.params["id"] as string;

    const isAdmin = req.user.role === "admin";
    if (!isAdmin) {
      const team = await teamsService.getTeamById(teamId);
      const isTeamManager = team.managerId === req.user.id;
      const isMember = req.user.teamId === teamId;
      if (!isTeamManager && !isMember) {
        throw new ApiError(
          ERROR_CODES.FORBIDDEN,
          "You can only view your own team members",
        );
      }
    }

    const members = await teamsService.getTeamMembersWithDetails(teamId);
    sendSuccess(res, members);
  } catch (error) {
    next(error);
  }
};

export const createTeam = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const team = await teamsService.createTeam(req.body);
    sendCreated(res, team);
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const team = await teamsService.updateTeam(
      req.params["id"] as string,
      req.body,
    );
    sendSuccess(res, team);
  } catch (error) {
    next(error);
  }
};

export const deleteTeam = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await teamsService.deleteTeam(req.params["id"] as string);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const addUserToTeam = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await teamsService.addUserToTeam(
      req.params["id"] as string,
      req.body.userId,
    );
    sendSuccess(res, { message: "User added to team successfully" });
  } catch (error) {
    next(error);
  }
};

export const removeUserFromTeam = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const teamId = req.params["id"] as string;
    const userId = req.params["userId"] as string;
    await teamsService.removeUserFromTeam(userId, teamId);
    sendSuccess(res, { message: "User removed from team successfully" });
  } catch (error) {
    next(error);
  }
};

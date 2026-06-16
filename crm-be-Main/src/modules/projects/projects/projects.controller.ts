import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../../types/api.types.js";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  updateProjectMember,
  getProjectStats,
  getIdleProjects,
  getProjectResources,
  getProjectsByManagerId,
  getMyProjects,
  getProjectDashboardStats,
} from "./projects.service.js";
import * as notesService from "../notes/notes.service.js";
import * as filesService from "../files/files.service.js";
import {
  createNoteSchema,
  updateNoteSchema,
} from "../notes/notes.validator.js";
import { USER_ROLES } from "../../../config/constants.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberSchema,
} from "./projects.validator.js";
import { sendSuccess, sendCreated } from "../../../utils/responses.js";

export const accessCheck = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    sendSuccess(res, { allowed: true, userId: req.user!.id });
  } catch (error) {
    next(error);
  }
};

// Create Project
export const create = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = createProjectSchema.parse(req.body);
    const project = await createProject(input, req.user.role, req.user.id);
    sendCreated(res, project);
  } catch (error) {
    next(error);
  }
};

// List Projects
export const list = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Query filtering can be added later in service based on req.query
    const projects = await getProjects(req.user);
    sendSuccess(res, projects);
  } catch (error) {
    next(error);
  }
};

// Get Project Details
export const getById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = await getProjectById(req.params.id as string);
    sendSuccess(res, project);
  } catch (error) {
    next(error);
  }
};

// Update Project
export const update = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = updateProjectSchema.parse(req.body);
    const project = await updateProject(req.params.id as string, input);
    sendSuccess(res, project);
  } catch (error) {
    next(error);
  }
};

// Delete Project
export const remove = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await deleteProject(req.params.id as string);
    sendSuccess(res, null);
  } catch (error) {
    next(error);
  }
};

// Add Member
export const addMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = addMemberSchema.parse(req.body);
    const member = await addProjectMember({
      projectId: req.params.id as string,
      ...input,
    });
    sendCreated(res, member);
  } catch (error) {
    next(error);
  }
};

// Remove Member
export const removeMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await removeProjectMember(
      req.params.id as string,
      req.params.userId as string,
    );
    sendSuccess(res, null);
  } catch (error) {
    next(error);
  }
};

// Update Member
export const updateMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = updateMemberSchema.parse(req.body);
    await updateProjectMember(
      req.params.id as string,
      req.params.userId as string,
      input,
    );
    sendSuccess(res, null);
  } catch (error) {
    next(error);
  }
};

// =========================================
// Dashboard & Analytics Controllers
// =========================================

// Get Project Stats (Dashboard)
export const stats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const statsData = await getProjectStats(req.user);
    sendSuccess(res, statsData);
  } catch (error) {
    next(error);
  }
};

// Get Idle Projects (Admin only)
export const idleProjects = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projects = await getIdleProjects();
    sendSuccess(res, projects);
  } catch (error) {
    next(error);
  }
};

// Get Project Resources (for team assignment)
export const resources = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const resourceData = await getProjectResources(req.user);
    sendSuccess(res, resourceData);
  } catch (error) {
    next(error);
  }
};

// Get Projects by Manager (Admin viewing specific PM's projects; Manager sees own)
export const byManager = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Admins (role=admin or crm:admin permission) can query any manager's projects.
    // Everyone else can only query their own ID.
    const isAdmin =
      req.user.role === "admin" ||
      req.user.permissions.includes("crm:admin");
    const managerId = isAdmin
      ? (req.params.managerId as string)
      : req.user.id;
    const projects = await getProjectsByManagerId(managerId);
    sendSuccess(res, projects);
  } catch (error) {
    next(error);
  }
};

export const myProjects = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projects = await getMyProjects(req.user.id);
    sendSuccess(res, projects);
  } catch (error) {
    next(error);
  }
};

export const dashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const stats = await getProjectDashboardStats(req.params.id as string);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

export const getProjectNotes = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = req.params.id as string;
    const hasAccess = await notesService.checkProjectAccess(projectId, req.user);
    if (!hasAccess) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You do not have access to this project",
      );
    }

    const isPrivate = req.query.private === "true";
    const notes = await notesService.getProjectNotes(
      projectId,
      isPrivate,
      isPrivate ? req.user.id : undefined,
    );
    sendSuccess(res, notes);
  } catch (error) {
    next(error);
  }
};

export const createProjectNote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = req.params.id as string;
    const hasAccess = await notesService.checkProjectAccess(projectId, req.user);
    if (!hasAccess) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You do not have access to this project",
      );
    }

    const input = createNoteSchema.parse(req.body);
    const note = await notesService.createNote(
      projectId,
      input.content,
      req.user.id,
      input.isPrivate ?? false,
    );
    sendSuccess(res, note, 201);
  } catch (error) {
    next(error);
  }
};

export const updateProjectNote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = updateNoteSchema.parse(req.body);
    const note = await notesService.updateNote(
      req.params.noteId as string,
      input.content,
      req.user.id,
      req.user,
    );
    sendSuccess(res, note);
  } catch (error) {
    next(error);
  }
};

export const pinProjectNote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const note = await notesService.pinNote(req.params.noteId as string);
    sendSuccess(res, note);
  } catch (error) {
    next(error);
  }
};

export const unpinProjectNote = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const note = await notesService.unpinNote(req.params.noteId as string);
    sendSuccess(res, note);
  } catch (error) {
    next(error);
  }
};

export const getProjectFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const files = await filesService.getProjectFiles(req.params.id as string);
    sendSuccess(res, files);
  } catch (error) {
    next(error);
  }
};

export const uploadProjectFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = req.params.id as string;
    const file = (req as AuthenticatedRequest & { file?: Express.Multer.File })
      .file;

    if (!file) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "No file uploaded");
    }

    const storagePath = await filesService.uploadToStorage(
      projectId,
      file.originalname,
      file.buffer,
      file.mimetype,
    );

    const record = await filesService.createProjectFile({
      projectId,
      name: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      storagePath,
      uploadedBy: req.user.id,
      description: req.body.description,
    });

    sendSuccess(res, record, 201);
  } catch (error) {
    next(error);
  }
};

export const getProjectFileDownload = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const files = await filesService.getProjectFiles(req.params.id as string);
    const file = files.find((f) => f.id === req.params.fileId);

    if (!file) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "File not found");
    }

    const downloadUrl = await filesService.getFileDownloadUrl(file.storagePath);
    sendSuccess(res, { downloadUrl });
  } catch (error) {
    next(error);
  }
};

export const deleteProjectFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const isAdmin = req.user.role === USER_ROLES.ADMIN;
    const files = await filesService.getProjectFiles(req.params.id as string);
    const file = files.find((f) => f.id === req.params.fileId);

    if (file) {
      try {
        await filesService.deleteFromStorage(file.storagePath);
      } catch (e) {
        console.error("Failed to delete from storage:", e);
      }
    }

    await filesService.deleteProjectFile(
      req.params.fileId as string,
      req.user.id,
      isAdmin,
    );

    sendSuccess(res, { message: "File deleted successfully" });
  } catch (error) {
    next(error);
  }
};

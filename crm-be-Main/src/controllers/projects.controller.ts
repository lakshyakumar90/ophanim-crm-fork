import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/api.types.js";
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
} from "../services/projects.service.js";
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberSchema,
} from "../validators/projects.validator.js";
import { sendSuccess, sendCreated } from "../utils/responses.js";

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

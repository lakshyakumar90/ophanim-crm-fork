import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
  type Router as RouterType,
} from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  requireRole,
  excludeDepartment,
} from "../middleware/authorization.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { USER_ROLES } from "../config/constants.js";
import * as projectController from "../controllers/projects.controller.js";
import type { AuthenticatedRequest } from "../types/api.types.js";
import { sendSuccess, ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import {
  createNoteSchema,
  updateNoteSchema,
} from "../validators/notes.validator.js";
import * as notesService from "../services/notes.service.js";
import * as filesService from "../services/files.service.js";
import {
  getMyProjects,
  getProjectDashboardStats,
} from "../services/projects.service.js";

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

// Block Sales and Finance department users from accessing Projects routes
router.use(excludeDepartment("sales", "finance") as any);

// =========================================
// Dashboard & Analytics Routes (MUST be before /:id)
// =========================================

// Get project stats for dashboard
router.get(
  "/stats",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(projectController.stats) as RequestHandler,
);

// Get idle projects (Admin only)
router.get(
  "/idle",
  requireRole(USER_ROLES.ADMIN) as RequestHandler,
  asyncHandler(projectController.idleProjects) as RequestHandler,
);

// Get project resources for team assignment
router.get(
  "/resources",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.resources) as RequestHandler,
);

// Get projects by manager (Admin viewing specific PM's projects)
router.get(
  "/by-manager/:managerId",
  requireRole(USER_ROLES.ADMIN) as RequestHandler,
  asyncHandler(projectController.byManager) as RequestHandler,
);

// =========================================
// Standard CRUD Routes
// =========================================

router.post(
  "/",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.create) as RequestHandler,
);

router.get(
  "/",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(projectController.list) as RequestHandler,
);

// Get my projects (for team members)
router.get(
  "/my-projects",
  requireRole(USER_ROLES.EMPLOYEE) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const projects = await getMyProjects(authReq.user.id);
    sendSuccess(res, projects);
  }) as RequestHandler,
);

// Get Project Dashboard Stats
router.get(
  "/:id/dashboard-stats",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await getProjectDashboardStats(req.params.id as string);
    sendSuccess(res, stats);
  }) as RequestHandler,
);

router.get(
  "/:id",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(projectController.getById) as RequestHandler,
);

router.put(
  "/:id",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.update) as RequestHandler,
);

router.delete(
  "/:id",
  requireRole(USER_ROLES.ADMIN) as RequestHandler,
  asyncHandler(projectController.remove) as RequestHandler,
);

// =========================================
// Members Routes
// =========================================

router.post(
  "/:id/members",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.addMember) as RequestHandler,
);

router.put(
  "/:id/members/:userId",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.updateMember) as RequestHandler,
);

router.delete(
  "/:id/members/:userId",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.removeMember) as RequestHandler,
);

// =========================================
// Notes Routes
// =========================================

// Get notes for a project
router.get(
  "/:id/notes",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const projectId = req.params.id as string;

    // Check access
    const hasAccess = await notesService.checkProjectAccess(
      projectId,
      authReq.user,
    );
    if (!hasAccess) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You do not have access to this project",
      );
    }

    const notes = await notesService.getProjectNotes(projectId);
    sendSuccess(res, notes);
  }) as RequestHandler,
);

// Create a note
router.post(
  "/:id/notes",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const projectId = req.params.id as string;

    // Check access
    const hasAccess = await notesService.checkProjectAccess(
      projectId,
      authReq.user,
    );
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
      authReq.user.id,
    );
    sendSuccess(res, note, 201);
  }) as RequestHandler,
);

// Update a note
router.put(
  "/:id/notes/:noteId",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const input = updateNoteSchema.parse(req.body);
    const note = await notesService.updateNote(
      req.params.noteId as string,
      input.content,
      authReq.user.id,
      authReq.user,
    );
    sendSuccess(res, note);
  }) as RequestHandler,
);

// Delete a note
router.delete(
  "/:id/notes/:noteId",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    await notesService.deleteNote(
      req.params.noteId as string,
      authReq.user.id,
      authReq.user,
    );
    sendSuccess(res, { message: "Note deleted successfully" });
  }) as RequestHandler,
);

// Pin a note (Manager/Admin only)
router.post(
  "/:id/notes/:noteId/pin",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await notesService.pinNote(req.params.noteId as string);
    sendSuccess(res, note);
  }) as RequestHandler,
);

// Unpin a note (Manager/Admin only)
router.post(
  "/:id/notes/:noteId/unpin",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await notesService.unpinNote(req.params.noteId as string);
    sendSuccess(res, note);
  }) as RequestHandler,
);

// =========================================
// File Routes
// =========================================

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Get all files for a project
router.get(
  "/:id/files",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const files = await filesService.getProjectFiles(req.params.id as string);
    sendSuccess(res, files);
  }) as RequestHandler,
);

// Upload a file to a project
router.post(
  "/:id/files",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  upload.single("file") as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const projectId = req.params.id as string;

    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }

    // Upload to storage
    const storagePath = await filesService.uploadToStorage(
      projectId,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype,
    );

    // Create file record
    const file = await filesService.createProjectFile({
      projectId,
      name: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      storagePath,
      uploadedBy: authReq.user.id,
      description: req.body.description,
    });

    sendSuccess(res, file, 201);
  }) as RequestHandler,
);

// Get download URL for a file
router.get(
  "/:id/files/:fileId/download",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const files = await filesService.getProjectFiles(req.params.id as string);
    const file = files.find((f) => f.id === req.params.fileId);

    if (!file) {
      res.status(404).json({ success: false, error: "File not found" });
      return;
    }

    const downloadUrl = await filesService.getFileDownloadUrl(file.storagePath);
    sendSuccess(res, { downloadUrl });
  }) as RequestHandler,
);

// Delete a file
router.delete(
  "/:id/files/:fileId",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const isAdmin = authReq.user.role === USER_ROLES.ADMIN;

    // Get file to retrieve storage path
    const files = await filesService.getProjectFiles(req.params.id as string);
    const file = files.find((f) => f.id === req.params.fileId);

    if (file) {
      // Delete from storage
      try {
        await filesService.deleteFromStorage(file.storagePath);
      } catch (e) {
        console.error("Failed to delete from storage:", e);
        // Continue to delete metadata even if storage deletion fails
      }
    }

    // Delete metadata
    await filesService.deleteProjectFile(
      req.params.fileId as string,
      authReq.user.id,
      isAdmin,
    );

    sendSuccess(res, { message: "File deleted successfully" });
  }) as RequestHandler,
);

export default router;

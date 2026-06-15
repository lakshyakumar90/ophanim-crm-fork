import {
  Router,
  type RequestHandler,
  type Router as RouterType,
} from "express";
import multer from "multer";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requireRole,
  excludeDepartment,
} from "../../../middleware/authorization.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { USER_ROLES } from "../../../config/constants.js";
import * as projectController from "./projects.controller.js";

const router: RouterType = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(authenticate as any);
router.use(excludeDepartment("sales", "finance") as any);

router.get(
  "/stats",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(projectController.stats) as RequestHandler,
);

router.get(
  "/idle",
  requireRole(USER_ROLES.ADMIN) as RequestHandler,
  asyncHandler(projectController.idleProjects) as RequestHandler,
);

router.get(
  "/resources",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.resources) as RequestHandler,
);

router.get(
  "/by-manager/:managerId",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.byManager) as RequestHandler,
);

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

router.get(
  "/my-projects",
  requireRole(USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.myProjects) as RequestHandler,
);

router.get(
  "/:id/dashboard-stats",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(projectController.dashboardStats) as RequestHandler,
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

router.get(
  "/:id/notes",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(projectController.getProjectNotes) as RequestHandler,
);

router.post(
  "/:id/notes",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(projectController.createProjectNote) as RequestHandler,
);

router.put(
  "/:id/notes/:noteId",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(projectController.updateProjectNote) as RequestHandler,
);

router.post(
  "/:id/notes/:noteId/pin",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.pinProjectNote) as RequestHandler,
);

router.post(
  "/:id/notes/:noteId/unpin",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.unpinProjectNote) as RequestHandler,
);

router.get(
  "/:id/files",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(projectController.getProjectFiles) as RequestHandler,
);

router.post(
  "/:id/files",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  upload.single("file") as RequestHandler,
  asyncHandler(projectController.uploadProjectFile) as RequestHandler,
);

router.get(
  "/:id/files/:fileId/download",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.EMPLOYEE,
  ) as RequestHandler,
  asyncHandler(projectController.getProjectFileDownload) as RequestHandler,
);

router.delete(
  "/:id/files/:fileId",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER) as RequestHandler,
  asyncHandler(projectController.deleteProjectFile) as RequestHandler,
);

export default router;

import {
  Router,
  type RequestHandler,
  type Router as RouterType,
} from "express";
import multer from "multer";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requirePermission,
  excludeDepartment,
  requireProjectMemberAssignment,
  requireProjectViewAccess,
} from "../../../middleware/authorization.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as projectController from "./projects.controller.js";
import milestonesRoutes from "../milestones/milestones.routes.js";
import sprintsRoutes from "../sprints/sprints.routes.js";
import timelineRoutes from "../timeline/timeline.routes.js";
import portalRoutes from "../portal/portal.routes.js";
import timeRoutes from "../time/time.routes.js";

const router: RouterType = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const viewProjects = requireProjectViewAccess() as RequestHandler;
const createProjects = requirePermission("projects:create") as RequestHandler;
const editProjects = requirePermission("projects:edit") as RequestHandler;
const closeProjects = requirePermission("projects:close") as RequestHandler;
const assignMembers = requireProjectMemberAssignment() as RequestHandler;
const participateInProjects = requireProjectViewAccess() as RequestHandler;

router.use(authenticate as any);
router.use(excludeDepartment("sales", "finance") as any);

router.get("/access-check", viewProjects, asyncHandler(projectController.accessCheck) as RequestHandler);

router.get("/stats", viewProjects, asyncHandler(projectController.stats) as RequestHandler);

router.get("/idle", closeProjects, asyncHandler(projectController.idleProjects) as RequestHandler);

router.get("/resources", viewProjects, asyncHandler(projectController.resources) as RequestHandler);

router.use("/time", timeRoutes);

router.use("/:projectId/milestones", milestonesRoutes);
router.use("/:projectId/sprints", sprintsRoutes);
router.use("/:projectId/timeline", timelineRoutes);
router.use("/:projectId/portal", portalRoutes);

router.get(
  "/by-manager/:managerId",
  viewProjects,
  asyncHandler(projectController.byManager) as RequestHandler,
);

router.post("/", createProjects, asyncHandler(projectController.create) as RequestHandler);

router.get("/", viewProjects, asyncHandler(projectController.list) as RequestHandler);

router.get("/my-projects", viewProjects, asyncHandler(projectController.myProjects) as RequestHandler);

router.get(
  "/:id/dashboard-stats",
  viewProjects,
  asyncHandler(projectController.dashboardStats) as RequestHandler,
);

router.get("/:id", viewProjects, asyncHandler(projectController.getById) as RequestHandler);

router.put("/:id", editProjects, asyncHandler(projectController.update) as RequestHandler);

router.delete("/:id", closeProjects, asyncHandler(projectController.remove) as RequestHandler);

router.post("/:id/members", assignMembers, asyncHandler(projectController.addMember) as RequestHandler);

router.put(
  "/:id/members/:userId",
  assignMembers,
  asyncHandler(projectController.updateMember) as RequestHandler,
);

router.delete(
  "/:id/members/:userId",
  assignMembers,
  asyncHandler(projectController.removeMember) as RequestHandler,
);

router.get("/:id/notes", viewProjects, asyncHandler(projectController.getProjectNotes) as RequestHandler);

router.post("/:id/notes", participateInProjects, asyncHandler(projectController.createProjectNote) as RequestHandler);

router.put("/:id/notes/:noteId", participateInProjects, asyncHandler(projectController.updateProjectNote) as RequestHandler);

router.post(
  "/:id/notes/:noteId/pin",
  editProjects,
  asyncHandler(projectController.pinProjectNote) as RequestHandler,
);

router.post(
  "/:id/notes/:noteId/unpin",
  editProjects,
  asyncHandler(projectController.unpinProjectNote) as RequestHandler,
);

router.get("/:id/files", viewProjects, asyncHandler(projectController.getProjectFiles) as RequestHandler);

router.post(
  "/:id/files",
  participateInProjects,
  upload.single("file") as RequestHandler,
  asyncHandler(projectController.uploadProjectFile) as RequestHandler,
);

router.get(
  "/:id/files/:fileId/download",
  viewProjects,
  asyncHandler(projectController.getProjectFileDownload) as RequestHandler,
);

router.delete(
  "/:id/files/:fileId",
  editProjects,
  asyncHandler(projectController.deleteProjectFile) as RequestHandler,
);

export default router;

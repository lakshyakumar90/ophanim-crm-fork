import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireAnyPermission, requirePermission } from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import {
  skillIdParamSchema,
  employeeSkillParamsSchema,
  employeeSkillsParamsSchema,
  listSkillsQuerySchema,
  createSkillSchema,
  updateSkillSchema,
  upsertEmployeeSkillSchema,
  updateEmployeeSkillSchema,
  skillsMatrixQuerySchema,
} from "./skills.validator.js";
import * as skillsController from "./skills.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/",
  requireAnyPermission(["skills:view", "skills:manage", "hr:manage"]) as any,
  validateQuery(listSkillsQuerySchema),
  asyncHandler(skillsController.listSkills) as RequestHandler,
);

router.get(
  "/matrix",
  requireAnyPermission(["skills:view", "skills:manage", "hr:manage"]) as any,
  validateQuery(skillsMatrixQuerySchema),
  asyncHandler(skillsController.getSkillsMatrix) as RequestHandler,
);

router.get(
  "/employee/:userId",
  requireAnyPermission(["skills:view", "skills:manage", "hr:manage"]) as any,
  validateParams(employeeSkillsParamsSchema),
  asyncHandler(skillsController.getEmployeeSkills) as RequestHandler,
);

router.post(
  "/employee/:userId",
  requirePermission("skills:manage") as any,
  validateParams(employeeSkillsParamsSchema),
  validateBody(upsertEmployeeSkillSchema),
  asyncHandler(skillsController.upsertEmployeeSkill) as RequestHandler,
);

router.put(
  "/employee/:userId/:skillId",
  requirePermission("skills:manage") as any,
  validateParams(employeeSkillParamsSchema),
  validateBody(updateEmployeeSkillSchema),
  asyncHandler(skillsController.updateEmployeeSkill) as RequestHandler,
);

router.delete(
  "/employee/:userId/:skillId",
  requirePermission("skills:manage") as any,
  validateParams(employeeSkillParamsSchema),
  asyncHandler(skillsController.deleteEmployeeSkill) as RequestHandler,
);

router.get(
  "/:id",
  requireAnyPermission(["skills:view", "skills:manage", "hr:manage"]) as any,
  validateParams(skillIdParamSchema),
  asyncHandler(skillsController.getSkillById) as RequestHandler,
);

router.post(
  "/",
  requirePermission("skills:manage") as any,
  validateBody(createSkillSchema),
  asyncHandler(skillsController.createSkill) as RequestHandler,
);

router.put(
  "/:id",
  requirePermission("skills:manage") as any,
  validateParams(skillIdParamSchema),
  validateBody(updateSkillSchema),
  asyncHandler(skillsController.updateSkill) as RequestHandler,
);

router.delete(
  "/:id",
  requirePermission("skills:manage") as any,
  validateParams(skillIdParamSchema),
  asyncHandler(skillsController.deleteSkill) as RequestHandler,
);

export default router;

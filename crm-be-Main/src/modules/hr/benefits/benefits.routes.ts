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
  benefitPlanIdParamSchema,
  benefitEnrollmentIdParamSchema,
  listBenefitPlansQuerySchema,
  createBenefitPlanSchema,
  updateBenefitPlanSchema,
  listEnrollmentsQuerySchema,
  createEnrollmentSchema,
  updateEnrollmentSchema,
} from "./benefits.validator.js";
import * as benefitsController from "./benefits.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/plans",
  requireAnyPermission(["benefits:view", "benefits:manage", "hr:manage"]) as any,
  validateQuery(listBenefitPlansQuerySchema),
  asyncHandler(benefitsController.listBenefitPlans) as RequestHandler,
);

router.get(
  "/plans/:id",
  requireAnyPermission(["benefits:view", "benefits:manage", "hr:manage"]) as any,
  validateParams(benefitPlanIdParamSchema),
  asyncHandler(benefitsController.getBenefitPlanById) as RequestHandler,
);

router.post(
  "/plans",
  requirePermission("benefits:manage") as any,
  validateBody(createBenefitPlanSchema),
  asyncHandler(benefitsController.createBenefitPlan) as RequestHandler,
);

router.put(
  "/plans/:id",
  requirePermission("benefits:manage") as any,
  validateParams(benefitPlanIdParamSchema),
  validateBody(updateBenefitPlanSchema),
  asyncHandler(benefitsController.updateBenefitPlan) as RequestHandler,
);

router.delete(
  "/plans/:id",
  requirePermission("benefits:manage") as any,
  validateParams(benefitPlanIdParamSchema),
  asyncHandler(benefitsController.deleteBenefitPlan) as RequestHandler,
);

router.get(
  "/enrollments/me",
  asyncHandler(benefitsController.getMyEnrollments) as RequestHandler,
);

router.get(
  "/enrollments",
  requireAnyPermission(["benefits:view", "benefits:manage", "hr:manage"]) as any,
  validateQuery(listEnrollmentsQuerySchema),
  asyncHandler(benefitsController.listEnrollments) as RequestHandler,
);

router.get(
  "/enrollments/:id",
  requireAnyPermission(["benefits:view", "benefits:manage", "hr:manage"]) as any,
  validateParams(benefitEnrollmentIdParamSchema),
  asyncHandler(benefitsController.getEnrollmentById) as RequestHandler,
);

router.post(
  "/enrollments",
  requirePermission("benefits:manage") as any,
  validateBody(createEnrollmentSchema),
  asyncHandler(benefitsController.createEnrollment) as RequestHandler,
);

router.put(
  "/enrollments/:id",
  requirePermission("benefits:manage") as any,
  validateParams(benefitEnrollmentIdParamSchema),
  validateBody(updateEnrollmentSchema),
  asyncHandler(benefitsController.updateEnrollment) as RequestHandler,
);

export default router;

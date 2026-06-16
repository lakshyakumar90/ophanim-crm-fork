import { Router, type Router as RouterType, type RequestHandler } from "express";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as portalController from "./portal.controller.js";

const router: RouterType = Router();

router.get(
  "/projects/:token",
  asyncHandler(portalController.getPublicProjectStatus) as RequestHandler,
);

export default router;

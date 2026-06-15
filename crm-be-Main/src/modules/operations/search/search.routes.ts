import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as searchController from "./search.controller.js";

const router: RouterType = Router();

router.get(
  "/",
  authenticate as any,
  asyncHandler(searchController.search) as RequestHandler,
);

export default router;

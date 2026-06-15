import { Router, type RequestHandler } from "express";
import { internalRouteRateLimiter } from "../../../middleware/rate-limiter.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as internalController from "./internal.controller.js";

const router: Router = Router();
router.use(internalRouteRateLimiter);

router.post("/auto-logout", asyncHandler(internalController.autoLogout) as RequestHandler);

export default router;

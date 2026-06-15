import { Router, type Router as RouterType } from "express";
import * as healthController from "./health.controller.js";

const router: RouterType = Router();

router.get("/", healthController.healthCheck);
router.get("/ready", healthController.readinessCheck);

export default router;

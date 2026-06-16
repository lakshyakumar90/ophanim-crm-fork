import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import {
  createQuoteSchema,
  updateQuoteSchema,
  quoteListQuerySchema,
} from "./quotes.validator.js";
import { uuidParamSchema } from "../../core/users/users.validator.js";
import * as quotesController from "./quotes.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/",
  requirePermission("quotes:view") as any,
  validateQuery(quoteListQuerySchema),
  asyncHandler(quotesController.getQuotes) as RequestHandler,
);

router.post(
  "/",
  requirePermission("quotes:manage") as any,
  validateBody(createQuoteSchema),
  asyncHandler(quotesController.createQuote) as RequestHandler,
);

router.get(
  "/:id",
  requirePermission("quotes:view") as any,
  validateParams(uuidParamSchema),
  asyncHandler(quotesController.getQuoteById) as RequestHandler,
);

router.put(
  "/:id",
  requirePermission("quotes:manage") as any,
  validateParams(uuidParamSchema),
  validateBody(updateQuoteSchema),
  asyncHandler(quotesController.updateQuote) as RequestHandler,
);

router.delete(
  "/:id",
  requirePermission("quotes:manage") as any,
  validateParams(uuidParamSchema),
  asyncHandler(quotesController.deleteQuote) as RequestHandler,
);

router.post(
  "/:id/send",
  requirePermission("quotes:send") as any,
  validateParams(uuidParamSchema),
  asyncHandler(quotesController.sendQuote) as RequestHandler,
);

router.post(
  "/:id/accept",
  requirePermission("quotes:approve") as any,
  validateParams(uuidParamSchema),
  asyncHandler(quotesController.acceptQuote) as RequestHandler,
);

export default router;

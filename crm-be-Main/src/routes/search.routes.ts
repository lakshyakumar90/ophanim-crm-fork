import {
  Router,
  type Request,
  type Response,
  type Router as RouterType,
} from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { searchGlobal } from "../services/search.service.js";
import { sendSuccess } from "../utils/responses.js";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: RouterType = Router();

router.get(
  "/",
  authenticate as any,
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const type = req.query.type as string;
    const duration = req.query.duration as string;

    if (!query) {
      sendSuccess(res, []);
      return;
    }
    const authReq = req as unknown as AuthenticatedRequest;
    const results = await searchGlobal(query, authReq.user, { type, duration });
    sendSuccess(res, results);
  }),
);

export default router;

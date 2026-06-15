import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/env.js";
import { API_PREFIX } from "./config/constants.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middleware/error.middleware.js";
import { defaultRateLimiter } from "./middleware/rate-limiter.middleware.js";
import { logger } from "./utils/logger.js";
import { supabaseAdmin } from "./config/supabase.js";
import { registerRoutes } from "./modules/register-routes.js";

const app: Application = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: config.frontend.url,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Exported-Count", "X-Removed-Count"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestIdMiddleware);
app.use(defaultRateLimiter);

app.get("/", (req, res) => {
  const requestId = (req as Express.Request & { requestId?: string }).requestId;
  res.status(200).json({
    success: true,
    service: "CRM Backend",
    version: "1.0.0",
    status: "running",
    environment: config.server.nodeEnv,
    health: "/health",
    apiPrefix: API_PREFIX,
    requestId,
  });
});

registerRoutes(app);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

const PORT = config.server.port;

async function verifyAttendanceSchema(): Promise<void> {
  const { error } = await supabaseAdmin
    .from("attendance")
    .select("id,clock_in_time,clock_out_time")
    .limit(1);

  if (error) {
    const projectRef = (() => {
      try {
        return new URL(config.supabase.url).host.split(".")[0];
      } catch {
        return "unknown";
      }
    })();
    throw new Error(
      `Attendance schema check failed for project ${projectRef}: ${error.message}`,
    );
  }
}

if (!process.env.VERCEL) {
  (async () => {
    try {
      await verifyAttendanceSchema();

      if (config.workers.enableReminderWorker) {
        import("./modules/operations/workers/reminder.service.js").then(
          ({ startReminderService }) => {
            startReminderService();
          },
        ).catch((err) => {
          logger.error("Failed to start reminder service", err);
        });
      } else {
        logger.info("Reminder worker disabled (ENABLE_REMINDER_WORKER=false)");
      }

      const server = app.listen(PORT, () => {
        logger.info(`CRM Backend server running on port ${PORT}`);
        logger.info(`API available at http://localhost:${PORT}${API_PREFIX}`);
        logger.info(`Health check at http://localhost:${PORT}/health`);
        logger.info(`Environment: ${config.server.nodeEnv}`);
      });

      server.setTimeout(300000);
    } catch (error) {
      logger.error(
        { error, supabaseUrl: config.supabase.url },
        "Startup schema verification failed",
      );
      process.exit(1);
    }
  })();
}

export default app;

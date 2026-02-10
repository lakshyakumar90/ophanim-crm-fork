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

// Import routes
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import teamsRoutes from "./routes/teams.routes.js";
import teamNotesRoutes from "./routes/team-notes.routes.js";

// ...
import leadsRoutes from "./routes/leads.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import csvRoutes from "./routes/csv.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import emailRoutes from "./routes/email.routes.js";
import departmentsRoutes from "./routes/departments.routes.js";
import financeRoutes from "./routes/finance.routes.js";
import searchRoutes from "./routes/search.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import hrRoutes from "./routes/hr.routes.js";
import cronRoutes from "./routes/cron.routes.js";
import internalRoutes from "./routes/internal.routes.js";
import adminRoutes from "./routes/admin.routes.js";

// Create Express app
const app: Application = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.frontend.url,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Exported-Count", "X-Removed-Count"],
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request ID and logging middleware
app.use(requestIdMiddleware);

// Rate limiting
app.use(defaultRateLimiter);

// Root route - required for serverless platforms
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

// Health check routes (no API prefix)
app.use("/health", healthRoutes);

// API v1 routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/teams`, teamsRoutes);
app.use(`${API_PREFIX}/teams`, teamNotesRoutes);
app.use(`${API_PREFIX}/leads`, leadsRoutes);
app.use(`${API_PREFIX}/tasks`, tasksRoutes);
app.use(`${API_PREFIX}/attendance`, attendanceRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/csv`, csvRoutes);
app.use(`${API_PREFIX}/activities`, activityRoutes);
app.use(`${API_PREFIX}/email`, emailRoutes);
app.use(`${API_PREFIX}/departments`, departmentsRoutes);
app.use(`${API_PREFIX}/finance`, financeRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/projects`, projectsRoutes);
app.use(`${API_PREFIX}/hr`, hrRoutes);
app.use(`${API_PREFIX}/cron`, cronRoutes);
app.use(`${API_PREFIX}/internal`, internalRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// 404 handler
app.use(notFoundMiddleware);

// Global error handler
app.use(errorMiddleware);

// Start server (only when not running as serverless function)
const PORT = config.server.port;

// Check if running in Vercel serverless environment
if (!process.env.VERCEL) {
  if (config.workers.enableReminderWorker) {
    // Import and start reminder service only when explicitly enabled.
    import("./services/reminder.service.js").then(
      ({ startReminderService }) => {
        startReminderService();
      },
    );
  } else {
    logger.info("Reminder worker disabled (ENABLE_REMINDER_WORKER=false)");
  }

  const server = app.listen(PORT, () => {
    logger.info(`🚀 CRM Backend server running on port ${PORT}`);
    logger.info(`📍 API available at http://localhost:${PORT}${API_PREFIX}`);
    logger.info(`💚 Health check at http://localhost:${PORT}/health`);
    logger.info(`🔧 Environment: ${config.server.nodeEnv}`);
  });

  // Set timeout to 5 minutes for long-running imports
  server.setTimeout(300000);
}

// Export for Vercel serverless
export default app;

import express from "express";
import type { Express } from "express";

export async function createRbacTestApp(): Promise<Express> {
  const app = express();
  app.use(express.json());

  const [
    { default: financeRoutes },
    { default: projectsRoutes },
    { default: tasksRoutes },
    { errorMiddleware },
  ] = await Promise.all([
    import("../../src/modules/finance/finance.routes.js"),
    import("../../src/modules/projects/projects/projects.routes.js"),
    import("../../src/modules/sales/tasks/tasks.routes.js"),
    import("../../src/middleware/error.middleware.js"),
  ]);

  app.use("/api/v1/finance", financeRoutes);
  app.use("/api/v1/projects", projectsRoutes);
  app.use("/api/v1/tasks", tasksRoutes);
  app.use(errorMiddleware as express.ErrorRequestHandler);

  return app;
}

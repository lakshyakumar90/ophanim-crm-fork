import express from "express";
import type { Express } from "express";

export async function createHrTestApp(): Promise<Express> {
  const app = express();
  app.use(express.json());

  const [
    { default: hrRoutes },
    { default: payrollRoutes },
    { default: performanceRoutes },
    { errorMiddleware },
  ] = await Promise.all([
    import("../../src/modules/hr/employees/hr.routes.js"),
    import("../../src/modules/hr/payroll/payroll.routes.js"),
    import("../../src/modules/hr/performance/performance.routes.js"),
    import("../../src/middleware/error.middleware.js"),
  ]);

  app.use("/api/v1/hr", hrRoutes);
  app.use("/api/v1/payroll", payrollRoutes);
  app.use("/api/v1/performance", performanceRoutes);
  app.use(errorMiddleware as express.ErrorRequestHandler);

  return app;
}

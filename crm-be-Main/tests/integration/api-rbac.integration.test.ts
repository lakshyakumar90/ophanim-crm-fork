import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Ensure backend config/env parsing succeeds in isolated test runs.
process.env.NODE_ENV ??= "test";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.JWT_SECRET ??= "test-secret-with-at-least-32-characters";
process.env.FRONTEND_URL ??= "http://localhost:3000";

let payrollRunStatusForGuard = "approved";
let checklistOwnerId = "11111111-1111-1111-1111-111111111111";
const VALID_ID = "123e4567-e89b-42d3-a456-426614174000";

vi.mock("../../src/middleware/auth.middleware.js", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const raw = req.headers["x-test-user"];
    if (raw) {
      const value = Array.isArray(raw) ? raw[0] : raw;
      req.user = JSON.parse(String(value));
    }
    next();
  },
}));

vi.mock("../../src/config/supabase.js", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: { status: payrollRunStatusForGuard },
            error: null,
          })),
        })),
      })),
    })),
  },
}));

vi.mock("../../src/services/documents.service.js", () => ({
  getDocumentStats: vi.fn(async () => ({
    total: 10,
    verified: 6,
    unverified: 4,
    byType: [],
  })),
  verifyDocument: vi.fn(async () => ({
    id: VALID_ID,
    isVerified: true,
  })),
  unverifyDocument: vi.fn(async () => ({
    id: VALID_ID,
    isVerified: false,
  })),
}));

vi.mock("../../src/services/recruitment.service.js", () => ({
  getJobPostings: vi.fn(async () => []),
}));

vi.mock("../../src/services/payroll.service.js", () => ({
  getPayrollRuns: vi.fn(async () => []),
  disbursePayroll: vi.fn(async () => ({
    id: VALID_ID,
    status: "disbursed",
  })),
  initiatePayrollRun: vi.fn(async () => ({
    id: VALID_ID,
    status: "draft",
  })),
}));

vi.mock("../../src/services/performance.service.js", () => ({
  getReviewCycles: vi.fn(async () => []),
}));

vi.mock("../../src/services/onboarding.service.js", () => ({
  getOnboardingTemplates: vi.fn(async () => []),
  getChecklistById: vi.fn(async () => ({
    id: VALID_ID,
    employee_id: checklistOwnerId,
  })),
  updateChecklistTask: vi.fn(async () => ({
    id: VALID_ID,
    tasks: [],
  })),
}));

type TestUser = {
  id: string;
  email: string;
  role: "admin" | "manager" | "employee";
  teamId: string | null;
  departmentId: string | null;
  permissions: string[];
  roleIds: string[];
  roleNames: string[];
  isGlobal: boolean;
  departmentIds: string[];
};

function asHeader(user: TestUser): string {
  return JSON.stringify(user);
}

function makeUser(role: TestUser["role"], permissions: string[]): TestUser {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: `${role}@example.com`,
    role,
    teamId: null,
    departmentId: null,
    permissions,
    roleIds: [],
    roleNames: [],
    isGlobal: false,
    departmentIds: [],
  };
}

describe("API RBAC integration", () => {
  const app = express();

  beforeAll(async () => {
    app.use(express.json());

    const [{ default: hrRoutes }, { default: recruitmentRoutes }, { default: payrollRoutes }, { default: performanceRoutes }, { default: onboardingRoutes }] = await Promise.all([
      import("../../src/routes/hr.routes.js"),
      import("../../src/routes/recruitment.routes.js"),
      import("../../src/routes/payroll.routes.js"),
      import("../../src/routes/performance.routes.js"),
      import("../../src/routes/onboarding.routes.js"),
    ]);

    app.use("/api/v1/hr", hrRoutes);
    app.use("/api/v1/recruitment", recruitmentRoutes);
    app.use("/api/v1/payroll", payrollRoutes);
    app.use("/api/v1/performance", performanceRoutes);
    app.use("/api/v1/onboarding", onboardingRoutes);

    const [{ errorMiddleware }] = await Promise.all([
      import("../../src/middleware/error.middleware.js"),
    ]);
    app.use(errorMiddleware as any);
  }, 30000);

  it("allows and denies HR documents stats by permission", async () => {
    const allowed = makeUser("manager", ["hr:documents_view"]);
    const denied = makeUser("employee", []);

    const ok = await request(app)
      .get("/api/v1/hr/documents/stats")
      .set("x-test-user", asHeader(allowed));
    expect(ok.status).toBe(200);

    const no = await request(app)
      .get("/api/v1/hr/documents/stats")
      .set("x-test-user", asHeader(denied));
    expect(no.status).toBe(403);
  });

  it("allows and denies recruitment job-postings by permission", async () => {
    const allowed = makeUser("manager", ["recruitment:view"]);
    const denied = makeUser("employee", []);

    const ok = await request(app)
      .get("/api/v1/recruitment/job-postings")
      .set("x-test-user", asHeader(allowed));
    expect(ok.status).toBe(200);

    const no = await request(app)
      .get("/api/v1/recruitment/job-postings")
      .set("x-test-user", asHeader(denied));
    expect(no.status).toBe(403);
  });

  it("allows and denies payroll runs by permission", async () => {
    const allowed = makeUser("manager", ["payroll:view"]);
    const denied = makeUser("employee", []);

    const ok = await request(app)
      .get("/api/v1/payroll/runs")
      .set("x-test-user", asHeader(allowed));
    expect(ok.status).toBe(200);

    const no = await request(app)
      .get("/api/v1/payroll/runs")
      .set("x-test-user", asHeader(denied));
    expect(no.status).toBe(403);
  });

  it("allows and denies performance cycles by permission", async () => {
    const allowed = makeUser("manager", ["performance:view"]);
    const denied = makeUser("employee", []);

    const ok = await request(app)
      .get("/api/v1/performance/cycles")
      .set("x-test-user", asHeader(allowed));
    expect(ok.status).toBe(200);

    const no = await request(app)
      .get("/api/v1/performance/cycles")
      .set("x-test-user", asHeader(denied));
    expect(no.status).toBe(403);
  });

  it("allows and denies onboarding templates by permission", async () => {
    const allowed = makeUser("manager", ["onboarding:view"]);
    const denied = makeUser("employee", []);

    const ok = await request(app)
      .get("/api/v1/onboarding/templates")
      .set("x-test-user", asHeader(allowed));
    expect(ok.status).toBe(200);

    const no = await request(app)
      .get("/api/v1/onboarding/templates")
      .set("x-test-user", asHeader(denied));
    expect(no.status).toBe(403);
  });

  it("rejects invalid recruitment candidates query params", async () => {
    const allowed = makeUser("manager", ["recruitment:view"]);

    const bad = await request(app)
      .get("/api/v1/recruitment/candidates?page=not-a-number")
      .set("x-test-user", asHeader(allowed));

    expect(bad.status).toBe(400);
  });

  it("rejects invalid payroll run initiation payload", async () => {
    const allowed = makeUser("manager", ["payroll:manage"]);

    const bad = await request(app)
      .post("/api/v1/payroll/runs")
      .set("x-test-user", asHeader(allowed))
      .send({ month: "2025/10" });

    expect(bad.status).toBe(400);
  });

  it("blocks payroll disburse when run is not approved", async () => {
    payrollRunStatusForGuard = "submitted";
    const approver = makeUser("manager", ["payroll:approve"]);

    const blocked = await request(app)
      .post(`/api/v1/payroll/runs/${VALID_ID}/disburse`)
      .set("x-test-user", asHeader(approver));

    expect(blocked.status).toBe(400);
  });

  it("allows payroll disburse when run is approved", async () => {
    payrollRunStatusForGuard = "approved";
    const approver = makeUser("manager", ["payroll:approve"]);

    const ok = await request(app)
      .post(`/api/v1/payroll/runs/${VALID_ID}/disburse`)
      .set("x-test-user", asHeader(approver));

    expect(ok.status).toBe(200);
  });

  it("rejects invalid HR document verify payload", async () => {
    const allowed = makeUser("manager", ["hr:documents_manage"]);

    const bad = await request(app)
      .post(`/api/v1/hr/documents/${VALID_ID}/verify`)
      .set("x-test-user", asHeader(allowed))
      .send({ notes: "x".repeat(1001) });

    expect(bad.status).toBe(400);
  });

  it("allows onboarding checklist task updates for owner", async () => {
    checklistOwnerId = "11111111-1111-1111-1111-111111111111";
    const owner = makeUser("employee", []);

    const ok = await request(app)
      .put(`/api/v1/onboarding/checklists/${VALID_ID}/tasks/0`)
      .set("x-test-user", asHeader(owner))
      .send({ status: "done" });

    expect(ok.status).toBe(200);
  });

  it("denies onboarding checklist task updates for non-owner without HR manage", async () => {
    checklistOwnerId = "22222222-2222-2222-2222-222222222222";
    const otherEmployee = makeUser("employee", []);

    const denied = await request(app)
      .put(`/api/v1/onboarding/checklists/${VALID_ID}/tasks/0`)
      .set("x-test-user", asHeader(otherEmployee))
      .send({ status: "done" });

    expect(denied.status).toBe(403);
  });

  it("rejects invalid performance cycle id in cycle reviews route", async () => {
    const manager = makeUser("manager", ["performance:manage"]);

    const bad = await request(app)
      .get("/api/v1/performance/cycles/not-a-uuid/reviews")
      .set("x-test-user", asHeader(manager));

    expect(bad.status).toBe(400);
  });
});

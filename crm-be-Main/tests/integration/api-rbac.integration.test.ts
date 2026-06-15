import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { VALID_UUID } from "../helpers/env.js";
import { createHrTestApp } from "../helpers/create-hr-test-app.js";
import { asTestUserHeader, makeTestUser } from "../helpers/test-users.js";
import { createQueryBuilder } from "../helpers/mock-supabase.js";

const payrollRunStatus = vi.hoisted(() => ({ value: "approved" }));

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
    from: vi.fn((table: string) => {
      if (table === "payroll_runs") {
        return createQueryBuilder(() => ({
          data: { status: payrollRunStatus.value, id: VALID_UUID },
          error: null,
        }));
      }
      return createQueryBuilder(() => ({ data: [], error: null }));
    }),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(async () => ({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        })),
      })),
    },
  },
}));

vi.mock("../../src/modules/hr/documents/documents.service.js", () => ({
  getDocumentStats: vi.fn(async () => ({
    total: 10,
    verified: 6,
    unverified: 4,
    byType: [],
  })),
  verifyDocument: vi.fn(async () => ({
    id: VALID_UUID,
    isVerified: true,
  })),
  unverifyDocument: vi.fn(async () => ({
    id: VALID_UUID,
    isVerified: false,
  })),
}));

vi.mock("../../src/modules/hr/payroll/payroll.service.js", () => ({
  getPayrollRuns: vi.fn(async () => []),
  disbursePayroll: vi.fn(async () => ({
    id: VALID_UUID,
    status: "disbursed",
  })),
  initiatePayrollRun: vi.fn(async () => ({
    id: VALID_UUID,
    status: "draft",
  })),
  getPayrollRunById: vi.fn(async () => ({
    id: VALID_UUID,
    status: "approved",
  })),
}));

vi.mock("../../src/modules/hr/performance/performance.service.js", () => ({
  getReviewCycles: vi.fn(async () => []),
  getReviewCyclesForRequester: vi.fn(async () => []),
}));

describe("API RBAC integration", () => {
  let app: Awaited<ReturnType<typeof createHrTestApp>>;

  beforeAll(async () => {
    app = await createHrTestApp();
  }, 30000);

  it("allows and denies HR documents stats by permission", async () => {
    const allowed = makeTestUser("manager", ["hr:documents_view"]);
    const denied = makeTestUser("employee", []);

    const ok = await request(app)
      .get("/api/v1/hr/documents/stats")
      .set("x-test-user", asTestUserHeader(allowed));
    expect(ok.status).toBe(200);

    const no = await request(app)
      .get("/api/v1/hr/documents/stats")
      .set("x-test-user", asTestUserHeader(denied));
    expect(no.status).toBe(403);
  });

  it("allows and denies payroll runs by permission", async () => {
    const allowed = makeTestUser("manager", ["payroll:view"]);
    const denied = makeTestUser("employee", []);

    const ok = await request(app)
      .get("/api/v1/payroll/runs")
      .set("x-test-user", asTestUserHeader(allowed));
    expect(ok.status).toBe(200);

    const no = await request(app)
      .get("/api/v1/payroll/runs")
      .set("x-test-user", asTestUserHeader(denied));
    expect(no.status).toBe(403);
  });

  it("allows and denies performance cycles by permission", async () => {
    const allowed = makeTestUser("manager", ["performance:view"]);
    const denied = makeTestUser("employee", []);

    const ok = await request(app)
      .get("/api/v1/performance/cycles")
      .set("x-test-user", asTestUserHeader(allowed));
    expect(ok.status).toBe(200);

    const no = await request(app)
      .get("/api/v1/performance/cycles")
      .set("x-test-user", asTestUserHeader(denied));
    expect(no.status).toBe(403);
  });

  it("rejects invalid payroll run initiation payload", async () => {
    const allowed = makeTestUser("manager", ["payroll:manage"]);

    const bad = await request(app)
      .post("/api/v1/payroll/runs")
      .set("x-test-user", asTestUserHeader(allowed))
      .send({ month: "2025/10" });

    expect(bad.status).toBe(400);
  });

  it("blocks payroll disburse when run is not approved", async () => {
    payrollRunStatus.value = "submitted";
    const approver = makeTestUser("manager", ["payroll:approve"]);

    const blocked = await request(app)
      .post(`/api/v1/payroll/runs/${VALID_UUID}/disburse`)
      .set("x-test-user", asTestUserHeader(approver));

    expect(blocked.status).toBe(400);
  });

  it("allows payroll disburse when run is approved", async () => {
    payrollRunStatus.value = "approved";
    const approver = makeTestUser("manager", ["payroll:approve"]);

    const ok = await request(app)
      .post(`/api/v1/payroll/runs/${VALID_UUID}/disburse`)
      .set("x-test-user", asTestUserHeader(approver));

    expect(ok.status).toBe(200);
  });

  it("rejects invalid HR document verify payload", async () => {
    const allowed = makeTestUser("manager", ["hr:documents_manage"]);

    const bad = await request(app)
      .post(`/api/v1/hr/documents/${VALID_UUID}/verify`)
      .set("x-test-user", asTestUserHeader(allowed))
      .send({ notes: "x".repeat(1001) });

    expect(bad.status).toBe(400);
  });

  it("rejects invalid performance cycle id in cycle reviews route", async () => {
    const manager = makeTestUser("manager", ["performance:manage"]);

    const bad = await request(app)
      .get("/api/v1/performance/cycles/not-a-uuid/reviews")
      .set("x-test-user", asTestUserHeader(manager));

    expect(bad.status).toBe(400);
  });
});

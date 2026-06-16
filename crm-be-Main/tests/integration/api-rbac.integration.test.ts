import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { VALID_UUID } from "../helpers/env.js";
import { createHrTestApp } from "../helpers/create-hr-test-app.js";
import { createRbacTestApp } from "../helpers/create-rbac-test-app.js";
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

vi.mock("../../src/modules/finance/controllers/invoice.controller.js", () => ({
  get_invoices: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  get_invoices_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  get_invoices_id_preview: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  get_invoices_id_pdf: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_invoices: vi.fn(async (_req: any, res: any) => res.status(201).json({ data: {} })),
  put_invoices_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  delete_invoices_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_invoices_id_submit: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_invoices_id_approve: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_invoices_id_reject: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_invoices_id_cancel: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_invoices_id_mark_sent: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
}));

vi.mock("../../src/modules/finance/controllers/payment.controller.js", () => ({
  get_payments: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  get_invoices_id_payments: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  post_payments_upload_proof: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_invoices_id_payments: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  put_payments_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
}));

vi.mock("../../src/modules/finance/controllers/expense.controller.js", () => ({
  get_expenses: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  get_expenses_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_expenses: vi.fn(async (_req: any, res: any) => res.status(201).json({ data: {} })),
  put_expenses_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_expenses_id_approve: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_expenses_id_reject: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  get_expense_categories: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  post_expense_categories: vi.fn(async (_req: any, res: any) => res.status(201).json({ data: {} })),
  put_expense_categories_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
}));

vi.mock("../../src/modules/finance/controllers/approval.controller.js", () => ({
  get_approvals: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  get_approvals_count: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: { count: 0 } })),
  post_approvals_bulk_approve: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
}));

vi.mock("../../src/modules/finance/controllers/email-request.controller.js", () => ({
  get_email_requests: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  get_email_requests_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_email_requests: vi.fn(async (_req: any, res: any) => res.status(201).json({ data: {} })),
  put_email_requests_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_email_requests_id_submit: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_email_requests_id_approve: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_email_requests_id_reject: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_email_requests_id_send: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_email_requests_id_schedule: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
}));

vi.mock("../../src/modules/finance/controllers/recurring.controller.js", () => ({
  get_recurring: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  get_recurring_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_recurring: vi.fn(async (_req: any, res: any) => res.status(201).json({ data: {} })),
  put_recurring_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_recurring_id_pause: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_recurring_id_resume: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  delete_recurring_id: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
}));

vi.mock("../../src/modules/finance/controllers/finance-dashboard.controller.js", () => ({
  get_dashboard: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  get_dashboard_revenue_trend: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  get_dashboard_invoice_status: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  get_dashboard_outstanding_clients: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  get_dashboard_activity: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  get_analytics: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
}));

vi.mock("../../src/modules/finance/controllers/scheduled-email.controller.js", () => ({
  get_scheduled_emails: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  post_scheduled_emails_id_cancel: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_scheduled_emails_id_reschedule: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_cron_process_scheduled_emails: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_cron_process_recurring_invoices: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  post_cron_update_overdue: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
}));

vi.mock("../../src/modules/projects/projects/projects.controller.js", () => ({
  accessCheck: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: { allowed: true } })),
  stats: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  idleProjects: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  resources: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  byManager: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  create: vi.fn(async (_req: any, res: any) => res.status(201).json({ data: { id: VALID_UUID } })),
  list: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  myProjects: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  dashboardStats: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  getById: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  update: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  remove: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  addMember: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  updateMember: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  removeMember: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  getProjectNotes: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  createProjectNote: vi.fn(async (_req: any, res: any) => res.status(201).json({ data: {} })),
  updateProjectNote: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  pinProjectNote: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  unpinProjectNote: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  getProjectFiles: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  uploadProjectFile: vi.fn(async (_req: any, res: any) => res.status(201).json({ data: {} })),
  getProjectFileDownload: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  deleteProjectFile: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
}));

vi.mock("../../src/modules/sales/tasks/tasks.controller.js", () => ({
  getTasks: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  getMyTasksSummary: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  createTask: vi.fn(async (_req: any, res: any) => res.status(201).json({ data: {} })),
  getTaskById: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  updateTask: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  deleteTask: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  reassignTask: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
  getTaskComments: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: [] })),
  addTaskComment: vi.fn(async (_req: any, res: any) => res.status(201).json({ data: {} })),
  checkDueReminders: vi.fn(async (_req: any, res: any) => res.status(200).json({ data: {} })),
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

describe("Finance and projects RBAC integration", () => {
  let rbacApp: Awaited<ReturnType<typeof createRbacTestApp>>;

  beforeAll(async () => {
    rbacApp = await createRbacTestApp();
  }, 30000);

  it("allows and denies finance invoice list by permission", async () => {
    const allowed = makeTestUser("manager", ["invoices:view"]);
    const denied = makeTestUser("employee", []);

    const ok = await request(rbacApp)
      .get("/api/v1/finance/invoices")
      .set("x-test-user", asTestUserHeader(allowed));
    expect(ok.status).toBe(200);

    const no = await request(rbacApp)
      .get("/api/v1/finance/invoices")
      .set("x-test-user", asTestUserHeader(denied));
    expect(no.status).toBe(403);
  });

  it("allows and denies project create by permission", async () => {
    const allowed = makeTestUser("manager", ["projects:create"]);
    const denied = makeTestUser("employee", ["projects:view"]);

    const ok = await request(rbacApp)
      .post("/api/v1/projects")
      .set("x-test-user", asTestUserHeader(allowed))
      .send({ name: "Test Project", managerId: VALID_UUID });
    expect(ok.status).toBe(201);

    const no = await request(rbacApp)
      .post("/api/v1/projects")
      .set("x-test-user", asTestUserHeader(denied))
      .send({ name: "Test Project", managerId: VALID_UUID });
    expect(no.status).toBe(403);
  });

  it("allows and denies sales task delete by permission", async () => {
    const allowed = makeTestUser("manager", ["tasks:delete"]);
    const denied = makeTestUser("employee", ["tasks:view"]);

    const ok = await request(rbacApp)
      .delete(`/api/v1/tasks/${VALID_UUID}`)
      .set("x-test-user", asTestUserHeader(allowed));
    expect(ok.status).toBe(200);

    const no = await request(rbacApp)
      .delete(`/api/v1/tasks/${VALID_UUID}`)
      .set("x-test-user", asTestUserHeader(denied));
    expect(no.status).toBe(403);
  });
});

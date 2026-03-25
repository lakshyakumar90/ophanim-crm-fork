import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../../dist/config/supabase.js";
import { config } from "../../dist/config/env.js";

const baseUrl = `http://127.0.0.1:${config.server.port}`;

function tokenFor(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      teamId: user.team_id,
      type: "access",
    },
    config.jwt.secret,
    { expiresIn: "15m" },
  );
}

async function call(path, token) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // No JSON body for this response.
  }

  return { status: res.status, body };
}

async function main() {
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id,email,role,team_id,is_active")
    .eq("is_active", true)
    .in("role", ["admin", "manager", "employee"])
    .limit(200);

  if (error) {
    throw new Error(`Failed to query users: ${error.message}`);
  }
  if (!users?.length) {
    throw new Error("No active users found for E2E checks");
  }

  const byRole = {
    admin: users.find((u) => u.role === "admin"),
    manager: users.find((u) => u.role === "manager"),
    employee: users.find((u) => u.role === "employee"),
  };

  const userIds = users.map((u) => u.id);
  const { data: perms } = await supabaseAdmin
    .from("user_resolved_permissions")
    .select("user_id,permissions")
    .in("user_id", userIds);

  const permMap = new Map(
    (perms || []).map((p) => [p.user_id, p.permissions || []]),
  );

  const docAllowed = users.find((u) => {
    const p = permMap.get(u.id) || [];
    return (
      p.includes("crm:admin") ||
      p.includes("hr:documents_view") ||
      p.includes("hr:view") ||
      p.includes("hr:manage")
    );
  });

  const docDenied = users.find((u) => {
    const p = permMap.get(u.id) || [];
    return (
      !p.includes("crm:admin") &&
      !p.includes("hr:documents_view") &&
      !p.includes("hr:view") &&
      !p.includes("hr:manage")
    );
  });

  const tests = [];

  const addPermissionCase = async (name, path, requiredPerms) => {
    const allowed = users.find((u) => {
      const p = permMap.get(u.id) || [];
      if (p.includes("crm:admin")) return true;
      return requiredPerms.some((perm) => p.includes(perm));
    });

    const denied = users.find((u) => {
      const p = permMap.get(u.id) || [];
      if (p.includes("crm:admin")) return false;
      return !requiredPerms.some((perm) => p.includes(perm));
    });

    if (allowed) {
      const r = await call(path, tokenFor(allowed));
      tests.push({
        name: `${name} allowed (${allowed.role})`,
        expected: 200,
        actual: r.status,
      });
    } else {
      tests.push({
        name: `${name} allowed`,
        expected: "SKIP",
        actual: "SKIP",
      });
    }

    if (denied) {
      const r = await call(path, tokenFor(denied));
      tests.push({
        name: `${name} denied (${denied.role})`,
        expected: 403,
        actual: r.status,
      });
    } else {
      tests.push({
        name: `${name} denied`,
        expected: "SKIP",
        actual: "SKIP",
      });
    }
  };

  if (byRole.admin) {
    const r = await call("/api/v1/attendance/analytics", tokenFor(byRole.admin));
    tests.push({
      name: "attendance analytics admin",
      expected: 200,
      actual: r.status,
    });
  }

  if (byRole.manager) {
    const r = await call(
      "/api/v1/attendance/analytics",
      tokenFor(byRole.manager),
    );
    tests.push({
      name: "attendance analytics manager",
      expected: 200,
      actual: r.status,
    });
  }

  if (byRole.employee) {
    const r = await call(
      "/api/v1/attendance/analytics",
      tokenFor(byRole.employee),
    );
    tests.push({
      name: "attendance analytics employee",
      expected: 403,
      actual: r.status,
    });
  }

  if (docAllowed) {
    const r = await call("/api/v1/hr/documents/stats", tokenFor(docAllowed));
    tests.push({
      name: `documents stats allowed (${docAllowed.role})`,
      expected: 200,
      actual: r.status,
    });
  }

  if (docDenied) {
    const r = await call("/api/v1/hr/documents/stats", tokenFor(docDenied));
    tests.push({
      name: `documents stats denied (${docDenied.role})`,
      expected: 403,
      actual: r.status,
    });
  }

  await addPermissionCase("recruitment job postings", "/api/v1/recruitment/job-postings", [
    "recruitment:view",
    "recruitment:manage",
  ]);

  await addPermissionCase("payroll runs", "/api/v1/payroll/runs", [
    "payroll:view",
    "payroll:manage",
    "payroll:approve",
  ]);

  await addPermissionCase("performance cycles", "/api/v1/performance/cycles", [
    "performance:view",
    "performance:manage",
  ]);

  await addPermissionCase("onboarding templates", "/api/v1/onboarding/templates", [
    "onboarding:view",
    "onboarding:manage",
  ]);

  console.log("HR_PERMISSION_E2E_RESULTS_START");
  for (const t of tests) {
    if (t.expected === "SKIP") {
      console.log(`INFO | ${t.name} skipped: suitable test user not found`);
      continue;
    }
    const pass = t.expected === t.actual;
    console.log(
      `${pass ? "PASS" : "FAIL"} | ${t.name} | expected ${t.expected} got ${t.actual}`,
    );
  }

  if (!docAllowed) {
    console.log(
      "INFO | skipped documents-allowed case: no user with matching hr document permissions found",
    );
  }
  if (!docDenied) {
    console.log(
      "INFO | skipped documents-denied case: no user without matching hr document permissions found",
    );
  }
  console.log("HR_PERMISSION_E2E_RESULTS_END");

  const failures = tests.filter(
    (t) => t.expected !== "SKIP" && t.expected !== t.actual,
  );
  process.exit(failures.length > 0 ? 1 : 0);
}

await main();

/**
 * Move flat module files into domain subfolders.
 * Run from crm-be-Main: node scripts/nest-domain-subfolders.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");
const MODULES = path.join(SRC, "modules");

/** module -> { domain -> [file basenames without path] } */
const NEST_MAP = {
  operations: {
    attendance: ["attendance.routes", "attendance.controller", "attendance.service", "attendance.validator"],
    notifications: ["notifications.routes", "notifications.controller", "notifications.service", "notifications.validator"],
    dashboard: ["dashboard.routes", "dashboard.controller", "dashboard.service"],
    activity: ["activity.routes", "activity.controller", "activity.service"],
    csv: ["csv.routes", "csv.controller", "csv.service"],
    email: ["email.routes", "email.controller", "email.service", "user-email.service"],
    search: ["search.routes", "search.controller", "search.service"],
    workers: ["reminder.service"],
  },
  sales: {
    leads: ["leads.routes", "leads.controller", "leads.service", "leads.validator"],
    tasks: ["tasks.routes", "tasks.controller", "tasks.service", "tasks.validator"],
  },
  core: {
    admin: ["admin.routes", "admin.controller"],
    users: ["users.routes", "users.controller", "users.service", "users.validator"],
    teams: ["teams.routes", "teams.controller", "teams.service", "teams.validator"],
    "team-notes": ["team-notes.routes", "team-notes.controller", "team-notes.service", "team-notes.validator"],
    departments: ["departments.routes", "departments.controller", "departments.service", "departments.validator"],
    roles: ["roles.routes", "roles.controller"],
  },
  hr: {
    employees: ["hr.routes", "hr.controller", "hr.service", "hr.validator"],
    leave: ["leave.service"],
    documents: ["documents.service", "document-types.service", "documents.validator"],
    analytics: ["hr-analytics.service"],
    payroll: ["payroll.routes", "payroll.controller", "payroll.service", "payroll.validator"],
    performance: ["performance.routes", "performance.controller", "performance.service", "performance.validator"],
  },
  projects: {
    projects: ["projects.routes", "projects.controller", "projects.service", "projects.validator"],
    notes: ["notes.service", "notes.validator"],
    files: ["files.service"],
  },
  system: {
    health: ["health.routes", "health.controller"],
    cron: ["cron.routes", "cron.controller"],
    internal: ["internal.routes", "internal.controller"],
  },
  auth: {
    auth: ["auth.routes", "auth.controller", "auth.service", "auth.validator", "otp.service"],
  },
};

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function moveFile(from, to) {
  if (!fs.existsSync(from)) {
    console.warn(`SKIP missing: ${from}`);
    return false;
  }
  ensureDir(path.dirname(to));
  fs.renameSync(from, to);
  console.log(`MOVED ${path.relative(MODULES, from)} -> ${path.relative(MODULES, to)}`);
  return true;
}

function depthToShared(relFromFile) {
  const depth = relFromFile.split("/").length - 1;
  return "../".repeat(depth + 2);
}

function patchImportsInFile(filePath, moduleName, domain) {
  let content = fs.readFileSync(filePath, "utf8");
  const rel = path.relative(MODULES, filePath).replace(/\\/g, "/");
  const prefix = depthToShared(`${moduleName}/${domain}/x.ts`);

  // Fix config/middleware/utils/types/lib paths (was ../../, now one level deeper)
  content = content
    .replace(/from "\.\.\/\.\.\/config\//g, `from "${prefix}config/`)
    .replace(/from "\.\.\/\.\.\/middleware\//g, `from "${prefix}middleware/`)
    .replace(/from "\.\.\/\.\.\/utils\//g, `from "${prefix}utils/`)
    .replace(/from "\.\.\/\.\.\/types\//g, `from "${prefix}types/`)
    .replace(/from "\.\.\/\.\.\/lib\//g, `from "${prefix}lib/`);

  // Same-module sibling imports stay ./
  // Cross-domain within module: ../other-domain/file
  const modMap = NEST_MAP[moduleName];
  if (modMap) {
    for (const [otherDomain, files] of Object.entries(modMap)) {
      if (otherDomain === domain) continue;
      for (const base of files) {
        const oldSame = `from "./${base}.js"`;
        const oldFlat = `from "../${base}.js"`;
        const newPath = `from "../${otherDomain}/${base}.js"`;
        if (content.includes(oldSame) && !rel.includes(`/${otherDomain}/`)) {
          // only if importing from wrong place - same folder files use ./
        }
        content = content.replace(
          new RegExp(`from "\\.\\./${base}\\.js"`, "g"),
          newPath,
        );
      }
    }
  }

  // Cross-module fixes (common patterns)
  const crossModule = [
    ['from "../hr/leave.service.js"', 'from "../leave/leave.service.js"'],
    ['from "../operations/attendance.service.js"', 'from "../../operations/attendance/attendance.service.js"'],
    ['from "../operations/notifications.service.js"', 'from "../../operations/notifications/notifications.service.js"'],
    ['from "../operations/reminder.service.js"', 'from "../../operations/workers/reminder.service.js"'],
    ['from "../operations/user-email.service.js"', 'from "../../operations/email/user-email.service.js"'],
    ['from "../shared/activity-events.service.js"', 'from "../../shared/activity-events.service.js"'],
    ['from "../shared/cache.service.js"', 'from "../../shared/cache.service.js"'],
    ['from "../auth/auth.service.js"', 'from "../../auth/auth/auth.service.js"'],
    ['from "../auth/auth.validator.js"', 'from "../../auth/auth/auth.validator.js"'],
    ['from "../core/users.validator.js"', 'from "../../core/users/users.validator.js"'],
    ['from "../core/users.service.js"', 'from "../../core/users/users.service.js"'],
    ['from "../core/teams.service.js"', 'from "../../core/teams/teams.service.js"'],
    ['from "../hr/hr.service.js"', 'from "../../hr/employees/hr.service.js"'],
    ['from "../hr/leave.service.js"', 'from "../../hr/leave/leave.service.js"'],
    ['from "../hr/documents.service.js"', 'from "../../hr/documents/documents.service.js"'],
    ['from "../hr/document-types.service.js"', 'from "../../hr/documents/document-types.service.js"'],
    ['from "../hr/hr-analytics.service.js"', 'from "../../hr/analytics/hr-analytics.service.js"'],
    ['from "../hr/payroll.service.js"', 'from "../../hr/payroll/payroll.service.js"'],
    ['from "../hr/performance.service.js"', 'from "../../hr/performance/performance.service.js"'],
    ['from "../finance/services/', 'from "../../finance/services/'],
    ['from "./modules/operations/attendance.routes.js"', 'from "./modules/operations/attendance/attendance.routes.js"'],
    ['from "./modules/operations/notifications.routes.js"', 'from "./modules/operations/notifications/notifications.routes.js"'],
    ['from "./modules/operations/dashboard.routes.js"', 'from "./modules/operations/dashboard/dashboard.routes.js"'],
    ['from "./modules/operations/activity.routes.js"', 'from "./modules/operations/activity/activity.routes.js"'],
    ['from "./modules/operations/csv.routes.js"', 'from "./modules/operations/csv/csv.routes.js"'],
    ['from "./modules/operations/email.routes.js"', 'from "./modules/operations/email/email.routes.js"'],
    ['from "./modules/operations/search.routes.js"', 'from "./modules/operations/search/search.routes.js"'],
    ['from "./modules/sales/leads.routes.js"', 'from "./modules/sales/leads/leads.routes.js"'],
    ['from "./modules/sales/tasks.routes.js"', 'from "./modules/sales/tasks/tasks.routes.js"'],
    ['from "./modules/core/users.routes.js"', 'from "./modules/core/users/users.routes.js"'],
    ['from "./modules/core/teams.routes.js"', 'from "./modules/core/teams/teams.routes.js"'],
    ['from "./modules/core/team-notes.routes.js"', 'from "./modules/core/team-notes/team-notes.routes.js"'],
    ['from "./modules/core/departments.routes.js"', 'from "./modules/core/departments/departments.routes.js"'],
    ['from "./modules/core/roles.routes.js"', 'from "./modules/core/roles/roles.routes.js"'],
    ['from "./modules/core/admin.routes.js"', 'from "./modules/core/admin/admin.routes.js"'],
    ['from "./modules/hr/hr.routes.js"', 'from "./modules/hr/employees/hr.routes.js"'],
    ['from "./modules/hr/payroll.routes.js"', 'from "./modules/hr/payroll/payroll.routes.js"'],
    ['from "./modules/hr/performance.routes.js"', 'from "./modules/hr/performance/performance.routes.js"'],
    ['from "./modules/projects/projects.routes.js"', 'from "./modules/projects/projects/projects.routes.js"'],
    ['from "./modules/system/health.routes.js"', 'from "./modules/system/health/health.routes.js"'],
    ['from "./modules/system/cron.routes.js"', 'from "./modules/system/cron/cron.routes.js"'],
    ['from "./modules/system/internal.routes.js"', 'from "./modules/system/internal/internal.routes.js"'],
    ['from "./modules/auth/auth.routes.js"', 'from "./modules/auth/auth/auth.routes.js"'],
    ['from "./modules/operations/reminder.service.js"', 'from "./modules/operations/workers/reminder.service.js"'],
  ];

  for (const [from, to] of crossModule) {
    content = content.split(from).join(to);
  }

  fs.writeFileSync(filePath, content);
}

// Execute moves
for (const [moduleName, domains] of Object.entries(NEST_MAP)) {
  const modDir = path.join(MODULES, moduleName);
  if (!fs.existsSync(modDir)) continue;

  for (const [domain, bases] of Object.entries(domains)) {
    const domainDir = path.join(modDir, domain);
    ensureDir(domainDir);

    for (const base of bases) {
      const from = path.join(modDir, `${base}.ts`);
      const to = path.join(domainDir, `${base}.ts`);
      if (moveFile(from, to)) {
        patchImportsInFile(to, moduleName, domain);
      }
    }
  }
}

// Patch all ts files in modules for cross-references
function walkTs(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkTs(full, files);
    else if (e.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

const globalReplacements = [
  [/from "\.\.\/operations\/attendance\.service\.js"/g, 'from "../operations/attendance/attendance.service.js"'],
  [/from "\.\.\/\.\.\/operations\/attendance\.service\.js"/g, 'from "../../operations/attendance/attendance.service.js"'],
  [/from "\.\.\/operations\/notifications\.service\.js"/g, 'from "../operations/notifications/notifications.service.js"'],
  [/from "\.\.\/\.\.\/operations\/notifications\.service\.js"/g, 'from "../../operations/notifications/notifications.service.js"'],
  [/from "\.\.\/operations\/reminder\.service\.js"/g, 'from "../operations/workers/reminder.service.js"'],
  [/from "\.\.\/\.\.\/operations\/reminder\.service\.js"/g, 'from "../../operations/workers/reminder.service.js"'],
  [/from "\.\.\/operations\/user-email\.service\.js"/g, 'from "../operations/email/user-email.service.js"'],
  [/from "\.\.\/\.\.\/operations\/user-email\.service\.js"/g, 'from "../../operations/email/user-email.service.js"'],
  [/from "\.\.\/sales\/leads\.service\.js"/g, 'from "../sales/leads/leads.service.js"'],
  [/from "\.\.\/hr\/leave\.service\.js"/g, 'from "../hr/leave/leave.service.js"'],
  [/from "\.\.\/\.\.\/hr\/leave\.service\.js"/g, 'from "../../hr/leave/leave.service.js"'],
  [/from "\.\.\/auth\/auth\.service\.js"/g, 'from "../auth/auth/auth.service.js"'],
  [/from "\.\.\/\.\.\/auth\/auth\.service\.js"/g, 'from "../../auth/auth/auth.service.js"'],
  [/from "\.\.\/core\/users\.validator\.js"/g, 'from "../core/users/users.validator.js"'],
  [/from "\.\.\/\.\.\/core\/users\.validator\.js"/g, 'from "../../core/users/users.validator.js"'],
  [/from "\.\.\/core\/users\.service\.js"/g, 'from "../core/users/users.service.js"'],
  [/from "\.\.\/core\/teams\.service\.js"/g, 'from "../core/teams/teams.service.js"'],
  [/from "\.\.\/projects\/projects\.service\.js"/g, 'from "../projects/projects/projects.service.js"'],
  [/from "\.\.\/projects\/notes\.service\.js"/g, 'from "../projects/notes/notes.service.js"'],
  [/from "\.\.\/projects\/files\.service\.js"/g, 'from "../projects/files/files.service.js"'],
  [/from "\.\.\/hr\/documents\.service\.js"/g, 'from "../hr/documents/documents.service.js"'],
  [/from "\.\.\/hr\/document-types\.service\.js"/g, 'from "../hr/documents/document-types.service.js"'],
  [/from "\.\.\/hr\/hr-analytics\.service\.js"/g, 'from "../hr/analytics/hr-analytics.service.js"'],
  [/from "\.\.\/hr\/performance\.service\.js"/g, 'from "../hr/performance/performance.service.js"'],
  [/from "\.\.\/hr\/payroll\.service\.js"/g, 'from "../hr/payroll/payroll.service.js"'],
];

for (const file of walkTs(MODULES)) {
  let content = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const [re, rep] of globalReplacements) {
    if (re.test(content)) {
      content = content.replace(re, rep);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`PATCHED ${path.relative(MODULES, file)}`);
  }
}

// Update register-routes.ts and index.ts
const registerPath = path.join(MODULES, "register-routes.ts");
if (fs.existsSync(registerPath)) {
  let reg = fs.readFileSync(registerPath, "utf8");
  const routeUpdates = [
    ["./system/health.routes.js", "./system/health/health.routes.js"],
    ["./auth/auth.routes.js", "./auth/auth/auth.routes.js"],
    ["./core/users.routes.js", "./core/users/users.routes.js"],
    ["./core/teams.routes.js", "./core/teams/teams.routes.js"],
    ["./core/team-notes.routes.js", "./core/team-notes/team-notes.routes.js"],
    ["./sales/leads.routes.js", "./sales/leads/leads.routes.js"],
    ["./sales/tasks.routes.js", "./sales/tasks/tasks.routes.js"],
    ["./operations/attendance.routes.js", "./operations/attendance/attendance.routes.js"],
    ["./operations/notifications.routes.js", "./operations/notifications/notifications.routes.js"],
    ["./operations/dashboard.routes.js", "./operations/dashboard/dashboard.routes.js"],
    ["./operations/csv.routes.js", "./operations/csv/csv.routes.js"],
    ["./operations/activity.routes.js", "./operations/activity/activity.routes.js"],
    ["./operations/email.routes.js", "./operations/email/email.routes.js"],
    ["./operations/search.routes.js", "./operations/search/search.routes.js"],
    ["./core/departments.routes.js", "./core/departments/departments.routes.js"],
    ["./projects/projects.routes.js", "./projects/projects/projects.routes.js"],
    ["./hr/hr.routes.js", "./hr/employees/hr.routes.js"],
    ["./system/cron.routes.js", "./system/cron/cron.routes.js"],
    ["./system/internal.routes.js", "./system/internal/internal.routes.js"],
    ["./core/admin.routes.js", "./core/admin/admin.routes.js"],
    ["./core/roles.routes.js", "./core/roles/roles.routes.js"],
    ["./hr/payroll.routes.js", "./hr/payroll/payroll.routes.js"],
    ["./hr/performance.routes.js", "./hr/performance/performance.routes.js"],
  ];
  for (const [from, to] of routeUpdates) {
    reg = reg.split(from).join(to);
  }
  fs.writeFileSync(registerPath, reg);
  console.log("Updated register-routes.ts");
}

const indexPath = path.join(SRC, "index.ts");
if (fs.existsSync(indexPath)) {
  let idx = fs.readFileSync(indexPath, "utf8");
  idx = idx.replace(
    "./modules/operations/reminder.service.js",
    "./modules/operations/workers/reminder.service.js",
  );
  fs.writeFileSync(indexPath, idx);
}

console.log("\nDone. Run: npm run build");

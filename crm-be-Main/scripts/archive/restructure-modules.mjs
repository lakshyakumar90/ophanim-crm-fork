/**
 * Restructures backend into domain modules under src/modules/
 * Run from crm-be-Main: node scripts/restructure-modules.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");

/** @type {Record<string, string>} */
const MOVES = {
  "routes/auth.routes.ts": "modules/auth/auth.routes.ts",
  "services/auth.service.ts": "modules/auth/auth.service.ts",
  "services/otp.service.ts": "modules/auth/otp.service.ts",
  "validators/auth.validator.ts": "modules/auth/auth.validator.ts",

  "routes/leads.routes.ts": "modules/sales/leads.routes.ts",
  "services/leads.service.ts": "modules/sales/leads.service.ts",
  "validators/leads.validator.ts": "modules/sales/leads.validator.ts",
  "routes/tasks.routes.ts": "modules/sales/tasks.routes.ts",
  "services/tasks.service.ts": "modules/sales/tasks.service.ts",
  "validators/tasks.validator.ts": "modules/sales/tasks.validator.ts",

  "routes/users.routes.ts": "modules/core/users.routes.ts",
  "services/users.service.ts": "modules/core/users.service.ts",
  "validators/users.validator.ts": "modules/core/users.validator.ts",
  "routes/teams.routes.ts": "modules/core/teams.routes.ts",
  "services/teams.service.ts": "modules/core/teams.service.ts",
  "validators/teams.validator.ts": "modules/core/teams.validator.ts",
  "routes/team-notes.routes.ts": "modules/core/team-notes.routes.ts",
  "services/team-notes.service.ts": "modules/core/team-notes.service.ts",
  "validators/team-notes.validator.ts": "modules/core/team-notes.validator.ts",
  "routes/departments.routes.ts": "modules/core/departments.routes.ts",
  "services/departments.service.ts": "modules/core/departments.service.ts",
  "validators/departments.validator.ts": "modules/core/departments.validator.ts",
  "routes/roles.routes.ts": "modules/core/roles.routes.ts",
  "routes/admin.routes.ts": "modules/core/admin.routes.ts",

  "routes/attendance.routes.ts": "modules/operations/attendance.routes.ts",
  "services/attendance.service.ts": "modules/operations/attendance.service.ts",
  "validators/attendance.validator.ts": "modules/operations/attendance.validator.ts",
  "routes/notifications.routes.ts": "modules/operations/notifications.routes.ts",
  "services/notifications.service.ts": "modules/operations/notifications.service.ts",
  "validators/notifications.validator.ts": "modules/operations/notifications.validator.ts",
  "routes/dashboard.routes.ts": "modules/operations/dashboard.routes.ts",
  "services/dashboard.service.ts": "modules/operations/dashboard.service.ts",
  "routes/search.routes.ts": "modules/operations/search.routes.ts",
  "services/search.service.ts": "modules/operations/search.service.ts",
  "routes/activity.routes.ts": "modules/operations/activity.routes.ts",
  "services/activity.service.ts": "modules/operations/activity.service.ts",
  "routes/email.routes.ts": "modules/operations/email.routes.ts",
  "services/email.service.ts": "modules/operations/email.service.ts",
  "services/user-email.service.ts": "modules/operations/user-email.service.ts",
  "routes/csv.routes.ts": "modules/operations/csv.routes.ts",
  "services/csv.service.ts": "modules/operations/csv.service.ts",
  "services/reminder.service.ts": "modules/operations/reminder.service.ts",

  "services/activity-events.service.ts": "modules/shared/activity-events.service.ts",
  "services/cache.service.ts": "modules/shared/cache.service.ts",

  "routes/projects.routes.ts": "modules/projects/projects.routes.ts",
  "controllers/projects.controller.ts": "modules/projects/projects.controller.ts",
  "services/projects.service.ts": "modules/projects/projects.service.ts",
  "validators/projects.validator.ts": "modules/projects/projects.validator.ts",
  "services/notes.service.ts": "modules/projects/notes.service.ts",
  "validators/notes.validator.ts": "modules/projects/notes.validator.ts",
  "services/files.service.ts": "modules/projects/files.service.ts",

  "routes/hr.routes.ts": "modules/hr/hr.routes.ts",
  "services/hr.service.ts": "modules/hr/hr.service.ts",
  "validators/hr.validator.ts": "modules/hr/hr.validator.ts",
  "services/leave.service.ts": "modules/hr/leave.service.ts",
  "services/documents.service.ts": "modules/hr/documents.service.ts",
  "services/document-types.service.ts": "modules/hr/document-types.service.ts",
  "validators/documents.validator.ts": "modules/hr/documents.validator.ts",
  "services/hr-analytics.service.ts": "modules/hr/hr-analytics.service.ts",
  "routes/payroll.routes.ts": "modules/hr/payroll.routes.ts",
  "services/payroll.service.ts": "modules/hr/payroll.service.ts",
  "routes/performance.routes.ts": "modules/hr/performance.routes.ts",
  "services/performance.service.ts": "modules/hr/performance.service.ts",
  "validators/performance.validator.ts": "modules/hr/performance.validator.ts",

  "routes/finance.routes.ts": "modules/finance/finance.routes.ts",
  "validators/finance.validator.ts": "modules/finance/finance.validator.ts",

  "routes/health.routes.ts": "modules/system/health.routes.ts",
  "routes/cron.routes.ts": "modules/system/cron.routes.ts",
  "routes/internal.routes.ts": "modules/system/internal.routes.ts",
};

/** Map basename (no .service) -> new path from src */
const SERVICE_MAP = {};
for (const [oldRel, newRel] of Object.entries(MOVES)) {
  if (oldRel.startsWith("services/")) {
    const base = path.basename(oldRel, ".service.ts");
    SERVICE_MAP[base] = newRel.replace(/\.ts$/, ".js");
  }
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function moveFile(fromRel, toRel) {
  const from = path.join(SRC, fromRel);
  const to = path.join(SRC, toRel);
  if (!fs.existsSync(from)) {
    console.warn(`SKIP missing: ${fromRel}`);
    return false;
  }
  ensureDir(to);
  fs.renameSync(from, to);
  console.log(`MOVED ${fromRel} -> ${toRel}`);
  return true;
}

function moveFinanceFolder() {
  const fromDir = path.join(SRC, "services/finance");
  const toDir = path.join(SRC, "modules/finance/services");
  if (!fs.existsSync(fromDir)) return;
  ensureDir(path.join(toDir, ".keep"));
  for (const name of fs.readdirSync(fromDir)) {
    fs.renameSync(path.join(fromDir, name), path.join(toDir, name));
    console.log(`MOVED services/finance/${name} -> modules/finance/services/${name}`);
  }
  try {
    fs.rmdirSync(fromDir);
  } catch {
    /* ignore */
  }
}

function walkTsFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walkTsFiles(full, files);
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

function patchImports(content, filePath) {
  let out = content;
  const rel = path.relative(SRC, filePath).replace(/\\/g, "/");

  // Global path rewrites (old flat structure -> modules)
  const globalReplacements = [
    ["./routes/", "./modules/"],
    ["../routes/", "../modules/"],
    ["./services/finance/", "./modules/finance/services/"],
    ["../services/finance/", "../modules/finance/services/"],
    ["./services/reminder.service.js", "./modules/operations/reminder.service.js"],
    ["../services/reminder.service.js", "../modules/operations/reminder.service.js"],
    ["./controllers/projects.controller.js", "./modules/projects/projects.controller.js"],
    ["../controllers/projects.controller.js", "../modules/projects/projects.controller.js"],
  ];

  for (const [from, to] of globalReplacements) {
    out = out.split(from).join(to);
  }

  // Per-service rewrites
  for (const [base, newJs] of Object.entries(SERVICE_MAP)) {
    const patterns = [
      [`../services/${base}.service.js`, `../${newJs}`],
      [`./services/${base}.service.js`, `./${newJs}`],
      [`from "../services/${base}.service.js"`, `from "../${newJs}"`],
      [`from "./${base}.service.js"`, `from "./${path.basename(newJs)}"`],
    ];
    for (const [from, to] of patterns) {
      out = out.split(from).join(to);
    }
  }

  // Route-specific old paths -> module paths
  for (const [oldRel, newRel] of Object.entries(MOVES)) {
    const oldBase = path.basename(oldRel);
    const newJs = newRel.replace(/\.ts$/, ".js");
    out = out.split(`../routes/${oldBase.replace(".ts", ".js")}`).join(`../${newJs}`);
    out = out.split(`../validators/${oldBase.replace(".routes.ts", ".validator.ts").replace(".ts", ".js")}`).join(`../${newJs.replace(".routes.js", ".validator.js")}`);
  }

  // Files inside modules/* need ../../ for shared folders
  if (rel.startsWith("modules/")) {
    out = out
      .replace(/from "\.\.\/config\//g, 'from "../../config/')
      .replace(/from "\.\.\/middleware\//g, 'from "../../middleware/')
      .replace(/from "\.\.\/utils\//g, 'from "../../utils/')
      .replace(/from "\.\.\/types\//g, 'from "../../types/')
      .replace(/from "\.\.\/lib\//g, 'from "../../lib/');

    // finance/services one level deeper
    if (rel.startsWith("modules/finance/services/")) {
      out = out
        .replace(/from "\.\.\/\.\.\/config\//g, 'from "../../../config/')
        .replace(/from "\.\.\/\.\.\/utils\//g, 'from "../../../utils/')
        .replace(/from "\.\.\/user-email\.service\.js"/g, 'from "../../operations/user-email.service.js"');
    }

    // Same-module validator imports in routes
    if (rel.endsWith(".routes.ts")) {
      const mod = rel.split("/")[1];
      out = out.replace(
        new RegExp(`from "\\.\\./validators/([^"]+)\\.js"`, "g"),
        'from "./$1.js"',
      );
      // Fix service imports to same module
      out = out.replace(
        /from "\.\.\/services\/([^"]+)\.js"/g,
        (match, name) => {
          const base = name.replace(".service", "");
          if (SERVICE_MAP[base]) {
            const target = SERVICE_MAP[base];
            if (target.startsWith(`modules/${mod}/`)) {
              return `from "./${path.basename(target)}"`;
            }
            return `from "../${target.replace(`modules/${mod.split("/")[0]}/`, "").startsWith("modules/") ? target.replace("modules/", "../").replace(/\/[^/]+$/, (m) => m) : target}"`;
          }
          return match;
        },
      );
    }
  }

  // Cross-module service imports (explicit fixes)
  const crossModule = [
    ["./activity-events.service.js", "../shared/activity-events.service.js"],
    ["./cache.service.js", "../shared/cache.service.js"],
    ["./notifications.service.js", "../operations/notifications.service.js"],
    ["./email.service.js", "../operations/email.service.js"],
    ["./otp.service.js", "./otp.service.js"],
    ["./leave.service.js", "./leave.service.js"],
    ["./document-types.service.js", "./document-types.service.js"],
    ["./finance/invoice.service.js", "../finance/services/invoice.service.js"],
    ["./finance/expense.service.js", "../finance/services/expense.service.js"],
    ["./finance/payment.service.js", "../finance/services/payment.service.js"],
    ["./finance/approval.service.js", "../finance/services/approval.service.js"],
    ["./finance/finance-dashboard.service.js", "../finance/services/finance-dashboard.service.js"],
    ["./finance/email-request.service.js", "../finance/services/email-request.service.js"],
    ["./finance/recurring.service.js", "../finance/services/recurring.service.js"],
    ["./finance/scheduled-email.service.js", "../finance/services/scheduled-email.service.js"],
    ["./finance/invoice-pdf.service.js", "../finance/services/invoice-pdf.service.js"],
    ["../hr/leave.service.js", "../hr/leave.service.js"],
    ["../operations/user-email.service.js", "../operations/user-email.service.js"],
  ];

  // Apply cross-module only inside modules/
  if (rel.startsWith("modules/")) {
    for (const [from, to] of crossModule) {
      if (from.startsWith("./finance/") && !rel.includes("modules/operations/dashboard")) {
        // dashboard specific
      }
    }
  }

  return out;
}

function patchAllFiles() {
  for (const file of walkTsFiles(SRC)) {
    const original = fs.readFileSync(file, "utf8");
    const patched = patchImports(original, file);
    if (patched !== original) {
      fs.writeFileSync(file, patched);
      console.log(`PATCHED ${path.relative(SRC, file)}`);
    }
  }
}

// Run moves
for (const [from, to] of Object.entries(MOVES)) {
  moveFile(from, to);
}
moveFinanceFolder();
patchAllFiles();

console.log("\nMigration complete. Run: npm run build");

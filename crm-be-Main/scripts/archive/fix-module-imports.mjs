/**
 * Fix broken imports after module migration.
 * Run: node scripts/fix-module-imports.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");

const INDEX_IMPORTS = {
  healthRoutes: "./modules/system/health.routes.js",
  authRoutes: "./modules/auth/auth.routes.js",
  usersRoutes: "./modules/core/users.routes.js",
  teamsRoutes: "./modules/core/teams.routes.js",
  teamNotesRoutes: "./modules/core/team-notes.routes.js",
  leadsRoutes: "./modules/sales/leads.routes.js",
  tasksRoutes: "./modules/sales/tasks.routes.js",
  attendanceRoutes: "./modules/operations/attendance.routes.js",
  notificationsRoutes: "./modules/operations/notifications.routes.js",
  dashboardRoutes: "./modules/operations/dashboard.routes.js",
  csvRoutes: "./modules/operations/csv.routes.js",
  activityRoutes: "./modules/operations/activity.routes.js",
  emailRoutes: "./modules/operations/email.routes.js",
  departmentsRoutes: "./modules/core/departments.routes.js",
  financeRoutes: "./modules/finance/finance.routes.js",
  searchRoutes: "./modules/operations/search.routes.js",
  projectsRoutes: "./modules/projects/projects.routes.js",
  hrRoutes: "./modules/hr/hr.routes.js",
  cronRoutes: "./modules/system/cron.routes.js",
  internalRoutes: "./modules/system/internal.routes.js",
  adminRoutes: "./modules/core/admin.routes.js",
  rolesRoutes: "./modules/core/roles.routes.js",
  payrollRoutes: "./modules/hr/payroll.routes.js",
  performanceRoutes: "./modules/hr/performance.routes.js",
};

/** Cross-module service locations for same-folder relative fixes */
const SERVICE_LOCATIONS = {
  "activity-events.service.js": "shared",
  "cache.service.js": "shared",
  "notifications.service.js": "operations",
  "email.service.js": "operations",
  "user-email.service.js": "operations",
  "leave.service.js": "hr",
  "otp.service.js": "auth",
};

function walkTsFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist"].includes(entry.name)) continue;
      walkTsFiles(full, files);
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

function getModuleName(filePath) {
  const rel = path.relative(SRC, filePath).replace(/\\/g, "/");
  const m = rel.match(/^modules\/([^/]+)/);
  return m ? m[1] : null;
}

function fixModuleImports(content, filePath) {
  let out = content;
  const rel = path.relative(SRC, filePath).replace(/\\/g, "/");
  const currentModule = getModuleName(filePath);

  if (!currentModule) return out;

  // ../modules/X/foo.js -> relative from current module
  out = out.replace(
    /from "(\.\.\/)?modules\/([^/]+)\/([^"]+)"/g,
    (_match, _prefix, mod, rest) => {
      if (mod === currentModule) {
        return `from "./${rest}"`;
      }
      return `from "../${mod}/${rest}"`;
    },
  );

  // finance/services from finance module
  if (currentModule === "finance" && !rel.includes("/services/")) {
    out = out.replace(
      /from "\.\.\/finance\/services\//g,
      'from "./services/',
    );
  }

  // dashboard finance imports
  if (rel === "modules/operations/dashboard.service.ts") {
    out = out
      .replace(/from "\.\/finance\/invoice\.service\.js"/g, 'from "../finance/services/invoice.service.js"')
      .replace(/from "\.\/finance\/expense\.service\.js"/g, 'from "../finance/services/expense.service.js"');
  }

  // Same-folder wrong cross-service imports
  for (const [file, mod] of Object.entries(SERVICE_LOCATIONS)) {
    if (mod !== currentModule) {
      out = out.replace(
        new RegExp(`from "\\./${file.replace(".", "\\.")}"`, "g"),
        `from "../${mod}/${file}"`,
      );
    }
  }

  // hr payroll routes config path
  if (rel.includes("modules/hr/payroll.routes.ts") || rel.includes("modules/operations/attendance.routes.ts")) {
    out = out
      .replace(/from "\.\.\/config\//g, 'from "../../config/')
      .replace(/from "\.\.\/utils\//g, 'from "../../utils/');
  }

  // finance/services deep paths
  if (rel.startsWith("modules/finance/services/")) {
    out = out.replace(
      /from "\.\.\/\.\.\/operations\/user-email\.service\.js"/g,
      'from "../../operations/user-email.service.js"',
    );
    out = out.replace(
      /from "\.\.\/user-email\.service\.js"/g,
      'from "../../operations/user-email.service.js"',
    );
  }

  // projects controller validator paths
  if (rel === "modules/projects/projects.controller.ts") {
    out = out
      .replace(/from "\.\.\/projects\/projects\.service\.js"/g, 'from "./projects.service.js"')
      .replace(/from "\.\.\/projects\/projects\.validator\.js"/g, 'from "./projects.validator.js"');
  }

  return out;
}

function fixIndexTs() {
  const indexPath = path.join(SRC, "index.ts");
  let content = fs.readFileSync(indexPath, "utf8");

  for (const [varName, importPath] of Object.entries(INDEX_IMPORTS)) {
    const baseName = varName.replace("Routes", "");
    content = content.replace(
      new RegExp(`from "\\./modules/${baseName}\\.routes\\.js"`, "g"),
      `from "${importPath}"`,
    );
    content = content.replace(
      new RegExp(`from "\\./modules/[^"]+${varName.replace("Routes", "")}[^"]*"`, "g"),
      `from "${importPath}"`,
    );
  }

  // Direct replacements for broken index imports
  content = content
    .replace(/from "\.\/modules\/health\.routes\.js"/g, INDEX_IMPORTS.healthRoutes.replace("./", '"./').replace(/"$/, '.js"'))
    .replace(/from "\.\/modules\/auth\.routes\.js"/g, '"./modules/auth/auth.routes.js"')
    .replace(/from "\.\/modules\/users\.routes\.js"/g, '"./modules/core/users.routes.js"')
    .replace(/from "\.\/modules\/teams\.routes\.js"/g, '"./modules/core/teams.routes.js"')
    .replace(/from "\.\/modules\/team-notes\.routes\.js"/g, '"./modules/core/team-notes.routes.js"')
    .replace(/from "\.\/modules\/leads\.routes\.js"/g, '"./modules/sales/leads.routes.js"')
    .replace(/from "\.\/modules\/tasks\.routes\.js"/g, '"./modules/sales/tasks.routes.js"')
    .replace(/from "\.\/modules\/attendance\.routes\.js"/g, '"./modules/operations/attendance.routes.js"')
    .replace(/from "\.\/modules\/notifications\.routes\.js"/g, '"./modules/operations/notifications.routes.js"')
    .replace(/from "\.\/modules\/dashboard\.routes\.js"/g, '"./modules/operations/dashboard.routes.js"')
    .replace(/from "\.\/modules\/csv\.routes\.js"/g, '"./modules/operations/csv.routes.js"')
    .replace(/from "\.\/modules\/activity\.routes\.js"/g, '"./modules/operations/activity.routes.js"')
    .replace(/from "\.\/modules\/email\.routes\.js"/g, '"./modules/operations/email.routes.js"')
    .replace(/from "\.\/modules\/departments\.routes\.js"/g, '"./modules/core/departments.routes.js"')
    .replace(/from "\.\/modules\/finance\.routes\.js"/g, '"./modules/finance/finance.routes.js"')
    .replace(/from "\.\/modules\/search\.routes\.js"/g, '"./modules/operations/search.routes.js"')
    .replace(/from "\.\/modules\/projects\.routes\.js"/g, '"./modules/projects/projects.routes.js"')
    .replace(/from "\.\/modules\/hr\.routes\.js"/g, '"./modules/hr/hr.routes.js"')
    .replace(/from "\.\/modules\/cron\.routes\.js"/g, '"./modules/system/cron.routes.js"')
    .replace(/from "\.\/modules\/internal\.routes\.js"/g, '"./modules/system/internal.routes.js"')
    .replace(/from "\.\/modules\/admin\.routes\.js"/g, '"./modules/core/admin.routes.js"')
    .replace(/from "\.\/modules\/roles\.routes\.js"/g, '"./modules/core/roles.routes.js"')
    .replace(/from "\.\/modules\/payroll\.routes\.js"/g, '"./modules/hr/payroll.routes.js"')
    .replace(/from "\.\/modules\/performance\.routes\.js"/g, '"./modules/hr/performance.routes.js"');

  fs.writeFileSync(indexPath, content);
  console.log("Fixed index.ts");
}

// Fix all module files
for (const file of walkTsFiles(path.join(SRC, "modules"))) {
  const original = fs.readFileSync(file, "utf8");
  const fixed = fixModuleImports(original, file);
  if (fixed !== original) {
    fs.writeFileSync(file, fixed);
    console.log(`Fixed ${path.relative(SRC, file)}`);
  }
}

fixIndexTs();
console.log("Done");

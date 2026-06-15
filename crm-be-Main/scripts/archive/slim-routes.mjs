/**
 * Rewrite routes file to wire middleware + controller handlers.
 * Usage: node scripts/slim-routes.mjs <routes.ts> <controllerImportName> [handlerNamesCommaSeparated]
 */
import fs from "fs";

const [routesPath, controllerModule, namesArg] = process.argv.slice(2);
const src = fs.readFileSync(routesPath, "utf8");
const names = namesArg?.split(",") ?? [];

const routerIdx = src.indexOf("const router");
const preamble = src.slice(0, routerIdx);

const keepLines = preamble.split("\n").filter((l) => {
  if (!l.trim()) return true;
  if (l.startsWith("import") && l.includes("express")) return true;
  if (l.startsWith("import") && l.includes("middleware")) return true;
  if (l.startsWith("import") && l.includes("validation")) return true;
  if (l.startsWith("import") && l.includes("validator")) return true;
  if (l.startsWith("import") && l.includes("constants")) return true;
  if (l.startsWith("import") && l.includes("config/env")) return true;
  if (l.startsWith("import") && l.includes("multer")) return true;
  if (l.startsWith("import") && l.includes("authorization")) return true;
  if (l.startsWith("import") && l.includes("auth.middleware")) return true;
  if (l.startsWith("import") && l.includes("USER_ROLES")) return true;
  if (l.startsWith("import") && l.includes("PAYROLL_STATUSES")) return true;
  if (l.startsWith("const ") && l.includes("multer")) return true;
  if (l.startsWith("function requireRunStatus")) return true;
  if (l.startsWith("function requireHttpCronEnabled")) return true;
  if (l.startsWith("const hrDocumentUpload")) return true;
  if (l.startsWith("const paymentProofUpload")) return true;
  if (l.startsWith("const upload")) return true;
  return false;
});

// Also keep service imports only if needed in routes middleware - usually not

let out = keepLines.join("\n").trim() + "\n";
out += `import { asyncHandler } from "../../middleware/error.middleware.js";\n`;
out += `import * as ${controllerModule} from "./${controllerModule}.controller.js";\n\n`;

const routerLine = src.match(/const router[^=]*=[^;]+;/)[0];
out += routerLine.replace("Router()", "Router()") + "\n\n";

// router.use lines before first route
const useBlock = src.slice(routerIdx).match(/(?:router\.use\([^;]+;\s*\n)+/);
if (useBlock) out += useBlock[0];

let handlerIdx = 0;
const routeRe =
  /router\.(get|post|put|patch|delete)\(\s*([\s\S]*?)\n\);/g;
let m;
while ((m = routeRe.exec(src))) {
  const method = m[1];
  const block = m[2];
  const pathMatch = block.match(/["'`]([^"'`]+)["'`]/);
  if (!pathMatch) continue;
  const routePath = pathMatch[1];

  const middlewareLines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !l.startsWith('"') &&
        !l.startsWith("'") &&
        !l.startsWith("`") &&
        !l.startsWith("asyncHandler"),
    );

  const handlerName = names[handlerIdx] ?? `handler${handlerIdx + 1}`;
  handlerIdx++;

  out += `router.${method}(\n`;
  out += `  "${routePath}",\n`;
  for (const mw of middlewareLines) {
    out += `  ${mw}\n`;
  }
  out += `  asyncHandler(${controllerModule}.${handlerName}) as RequestHandler,\n`;
  out += `);\n\n`;
}

out += "export default router;\n";

// Ensure RequestHandler import
if (!out.includes("RequestHandler")) {
  out = out.replace(
    /from "express";/,
    'from "express";\nimport type { RequestHandler } from "express";',
  );
  if (!out.includes("RequestHandler")) {
    out =
      'import { Router, type RequestHandler, type Router as RouterType } from "express";\n' +
      out.replace(/import \{ Router[^}]+\} from "express";\n?/, "");
  }
}

fs.writeFileSync(routesPath, out);
console.log(`Slimmed ${routesPath} (${handlerIdx} routes)`);

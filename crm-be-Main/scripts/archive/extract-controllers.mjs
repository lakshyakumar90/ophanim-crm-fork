/**
 * Extract asyncHandler bodies from a routes file into a controller file.
 * Usage: node scripts/extract-controllers.mjs <routesPath> <controllerPath> [handlerNamesCommaSeparated]
 */
import fs from "fs";
import path from "path";

const [routesPath, controllerPath, namesArg] = process.argv.slice(2);
if (!routesPath || !controllerPath) {
  console.error(
    "Usage: node scripts/extract-controllers.mjs <routes.ts> <controller.ts> [name1,name2,...]",
  );
  process.exit(1);
}

const src = fs.readFileSync(routesPath, "utf8");
const routerIdx = src.indexOf("const router");

const importLines = [...src.matchAll(/^import\s[\s\S]*?;$/gm)]
  .map((m) => m[0])
  .filter(
    (stmt) =>
      !stmt.includes("express") &&
      !stmt.includes("middleware") &&
      !stmt.includes("asyncHandler") &&
      !stmt.includes("Router") &&
      !stmt.includes("api.types"),
  );
const uniqueImports = [...new Set(importLines)].join("\n");

const preamble = src.slice(0, routerIdx);

const utilBlock = (() => {
  const m = preamble.match(
    /(?:^function slugify[\s\S]*?^}\s*\n)(?:^function assertValidPermissions[\s\S]*?^}\s*\n)?/m,
  );
  return m ? m[0] : "";
})();

const extraFns = (() => {
  const m = preamble.match(
    /^function requireRunStatus[\s\S]*?^}\s*\n/m,
  );
  return m ? m[0] : "";
})();

// multer instances stay in routes, not controller

const names = namesArg
  ? namesArg.split(",")
  : null;

const parts = src.split("asyncHandler(async");
let ctrl = `import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../types/api.types.js";
${uniqueImports}
${utilBlock}${extraFns}
`;

for (let i = 1; i < parts.length; i++) {
  const name = names?.[i - 1] ?? `handler${i}`;
  let body = parts[i];
  const end = body.indexOf("}),");
  if (end < 0) continue;
  body = body.slice(0, end).trim();
  body = body.replace(/^\([^)]*\)\s*=>\s*\{/, "").replace(/\}\s*$/, "");
  body = body
    .replace(/const authReq = req as unknown as AuthenticatedRequest;\s*/g, "")
    .replace(/authReq\.user/g, "req.user")
    .replace(/_req: Request/g, "_req: AuthenticatedRequest");

  ctrl += `export const ${name} = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
${body}
  } catch (error) {
    next(error);
  }
};

`;
}

fs.mkdirSync(path.dirname(controllerPath), { recursive: true });
fs.writeFileSync(controllerPath, ctrl);
console.log(`Wrote ${controllerPath} (${parts.length - 1} handlers)`);

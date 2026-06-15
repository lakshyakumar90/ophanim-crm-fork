import { describe, expect, it } from "vitest";
import {
  requireAnyPermission,
  requirePermission,
} from "../../../src/middleware/authorization.middleware.js";
import { makeTestUser } from "../../helpers/test-users.js";
import { ERROR_CODES } from "../../../src/utils/error-codes.js";
import { ApiError } from "../../../src/utils/responses.js";

function runMiddleware(
  middleware: (req: any, res: any, next: (err?: unknown) => void) => void,
  user: ReturnType<typeof makeTestUser> | undefined,
) {
  const req = { user } as any;
  let caught: unknown;
  try {
    middleware(req, {} as any, (err?: unknown) => {
      if (err) caught = err;
    });
  } catch (err) {
    caught = err;
  }
  return caught;
}

describe("requireAnyPermission", () => {
  it("allows when user has one of the required permissions", () => {
    const user = makeTestUser("manager", ["hr:documents_view"]);
    const err = runMiddleware(
      requireAnyPermission(["hr:documents_view", "hr:view"]),
      user,
    );
    expect(err).toBeUndefined();
  });

  it("denies when user lacks all required permissions", () => {
    const user = makeTestUser("employee", []);
    const err = runMiddleware(
      requireAnyPermission(["hr:documents_view", "hr:view"]),
      user,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(ERROR_CODES.FORBIDDEN);
  });

  it("allows admin role without explicit permissions", () => {
    const user = makeTestUser("admin", []);
    const err = runMiddleware(requireAnyPermission(["payroll:view"]), user);
    expect(err).toBeUndefined();
  });

  it("allows crm:admin permission without matching feature permission", () => {
    const user = makeTestUser("employee", ["crm:admin"]);
    const err = runMiddleware(requireAnyPermission(["payroll:view"]), user);
    expect(err).toBeUndefined();
  });
});

describe("requirePermission", () => {
  it("requires exact permission", () => {
    const user = makeTestUser("manager", ["payroll:view"]);
    const err = runMiddleware(requirePermission("payroll:manage") as any, user);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(ERROR_CODES.FORBIDDEN);
  });

  it("passes when permission is present", () => {
    const user = makeTestUser("manager", ["payroll:manage"]);
    const err = runMiddleware(requirePermission("payroll:manage") as any, user);
    expect(err).toBeUndefined();
  });
});

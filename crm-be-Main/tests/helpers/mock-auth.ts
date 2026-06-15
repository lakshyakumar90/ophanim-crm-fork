import { vi } from "vitest";

/** Injects req.user from the x-test-user header (JSON). */
export function mockAuthenticateMiddleware() {
  vi.mock("../../src/middleware/auth.middleware.js", () => ({
    authenticate: (req: { headers: Record<string, unknown>; user?: unknown }, _res: unknown, next: () => void) => {
      const raw = req.headers["x-test-user"];
      if (raw) {
        const value = Array.isArray(raw) ? raw[0] : raw;
        req.user = JSON.parse(String(value));
      }
      next();
    },
  }));
}

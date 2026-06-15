import { vi } from "vitest";

type QueryResult = { data: unknown; error: unknown };

export type SupabaseMockOptions = {
  payrollRunStatus?: string;
  queryResult?: QueryResult;
};

/** Chainable Supabase query builder that supports await and .single(). */
export function createQueryBuilder(
  resolve: () => QueryResult = () => ({ data: [], error: null }),
) {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    "select",
    "eq",
    "neq",
    "order",
    "limit",
    "is",
    "in",
    "update",
    "insert",
    "delete",
    "filter",
  ] as const;

  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }

  builder.single = vi.fn(async () => resolve());
  builder.maybeSingle = vi.fn(async () => resolve());
  builder.then = (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(resolve()).then(onFulfilled, onRejected);

  return builder;
}

export function createSupabaseAdminMock(options: SupabaseMockOptions = {}) {
  let payrollRunStatus = options.payrollRunStatus ?? "approved";

  const from = vi.fn((table: string) => {
    if (table === "payroll_runs") {
      return createQueryBuilder(() => ({
        data: { status: payrollRunStatus, id: "123e4567-e89b-42d3-a456-426614174000" },
        error: null,
      }));
    }
    return createQueryBuilder(
      () => options.queryResult ?? { data: [], error: null },
    );
  });

  return {
    supabaseAdmin: {
      from,
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn(async () => ({
            data: { signedUrl: "https://example.com/signed" },
            error: null,
          })),
          upload: vi.fn(async () => ({ data: { path: "test/path" }, error: null })),
          remove: vi.fn(async () => ({ data: [], error: null })),
        })),
      },
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({ data: { user: null }, error: null })),
        },
      },
    },
    setPayrollRunStatus(status: string) {
      payrollRunStatus = status;
    },
  };
}

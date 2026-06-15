export type TestUser = {
  id: string;
  email: string;
  role: "admin" | "manager" | "employee";
  teamId: string | null;
  departmentId: string | null;
  permissions: string[];
  roleIds: string[];
  roleNames: string[];
  isGlobal: boolean;
  departmentIds: string[];
};

export function asTestUserHeader(user: TestUser): string {
  return JSON.stringify(user);
}

export function makeTestUser(
  role: TestUser["role"],
  permissions: string[],
  overrides: Partial<TestUser> = {},
): TestUser {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: `${role}@example.com`,
    role,
    teamId: null,
    departmentId: null,
    permissions,
    roleIds: [],
    roleNames: [],
    isGlobal: false,
    departmentIds: [],
    ...overrides,
  };
}

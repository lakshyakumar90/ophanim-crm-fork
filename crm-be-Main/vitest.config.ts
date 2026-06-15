import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["tests/setup/vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/scripts/**"],
    },
  },
});

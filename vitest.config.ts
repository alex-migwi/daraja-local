import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      reporter: ["text-summary", "json-summary", "html", "lcov"],
      thresholds: {
        statements: 84,
        branches: 70,
        functions: 85,
        lines: 84
      }
    }
  }
});

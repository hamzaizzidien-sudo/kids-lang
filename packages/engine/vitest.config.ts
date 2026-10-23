import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.ts"],
      // CLAUDE.md §10: engine coverage must stay at or above 90%.
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      // The React component is exercised by the app's Jest tests.
      include: ["src/**/*.ts"],
    },
  },
});

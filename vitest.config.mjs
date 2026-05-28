import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.{js,ts}"],
    exclude: ["node_modules", "cypress", "e2e"],
  },
});

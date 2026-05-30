import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".js", ".mjs", ".cjs", ".json"],
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.{js,ts}"],
    exclude: ["node_modules", "cypress", "e2e"],
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: { include: ["react/jsx-dev-runtime"] },
  test: {
    globals: true,
  },
});

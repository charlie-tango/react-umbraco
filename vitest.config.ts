import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: { include: ["react/jsx-dev-runtime"] },
  test: {
    globals: true,
    workspace: [
      {
        extends: true,
        test: {
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: [
            "**/*.browser.{test,spec}.{ts,tsx}",
            "**/browser/*.{test,spec}.{ts,tsx}",
          ],
          name: "node",
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          include: [
            "src/**/*.browser.{test,spec}.{ts,tsx}",
            "src/**/browser/*.{test,spec}.{ts,tsx}",
          ],
          name: "browser",
          browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }],
            provider: "playwright",
          },
        },
      },
    ],
  },
});

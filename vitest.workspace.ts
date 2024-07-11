import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "vitest.config.ts",
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
    extends: "vitest.config.ts",
    test: {
      include: [
        "src/**/*.browser.{test,spec}.{ts,tsx}",
        "src/**/browser/*.{test,spec}.{ts,tsx}",
      ],
      name: "browser",
      browser: {
        enabled: true,
        name: "chromium",
        provider: "playwright",
        headless: true,
      },
    },
  },
]);

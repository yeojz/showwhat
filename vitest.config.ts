import { defineConfig, defineProject } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx}", "apps/*/src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/dist/**",
        "packages/core/src/index.ts",
        "packages/core/src/schemas/index.ts",
        "packages/openfeature/src/index.ts",
        "packages/configurator/src/index.ts",
        "packages/configurator/src/types.ts",
        "packages/configurator/src/configurator/types.ts",
        "packages/configurator/src/configurator/preview-store.ts",
        "packages/configurator/src/test-setup.ts",
        "apps/webapp/src/main.tsx",
        "apps/webapp/src/vite-env.d.ts",
      ],
      thresholds: {
        // Global minimums: safety net across the entire codebase.
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
        // Core library: pure logic, no UI. 100% is achievable and expected.
        "packages/core/src/**": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        // Thin wrapper packages: 100% achievable.
        "packages/openfeature/src/**": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "packages/showwhat/src/**": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        // UI packages: v8 branch instrumentation in jsdom creates
        // unreachable branches (nullish-coalescing fallbacks, ternary
        // branches guarded by parent conditions, defensive guards).
        "apps/webapp/src/**": {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        "packages/configurator/src/**": {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
      },
    },
    projects: [
      defineProject({
        test: {
          name: "core",
          root: "packages/core",
          include: ["src/**/*.test.ts"],
        },
      }),
      defineProject({
        resolve: {
          alias: {
            "@": path.resolve(import.meta.dirname, "packages/configurator/src"),
          },
        },
        test: {
          name: "configurator",
          root: "packages/configurator",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test-setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
        },
      }),
      defineProject({
        test: {
          name: "showwhat",
          root: "packages/showwhat",
          include: ["src/**/*.test.ts"],
        },
      }),
      defineProject({
        test: {
          name: "openfeature",
          root: "packages/openfeature",
          include: ["src/**/*.test.ts"],
        },
      }),
      defineProject({
        test: {
          name: "webapp",
          root: "apps/webapp",
          environment: "jsdom",
          globals: true,
          include: ["src/**/*.test.{ts,tsx}"],
        },
      }),
    ],
  },
});

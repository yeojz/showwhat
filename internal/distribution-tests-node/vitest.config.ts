import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      showwhat: resolve(__dirname, "../../packages/showwhat/dist/index.js"),
      "@showwhat/core": resolve(__dirname, "../../packages/core/dist/index.js"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});

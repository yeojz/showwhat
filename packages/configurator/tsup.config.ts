import { defineConfig } from "tsup";
import path from "node:path";
import { copyFileSync } from "node:fs";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: "dist",
  external: ["react", "react-dom"],
  esbuildOptions(options) {
    options.alias = {
      "@": path.resolve(import.meta.dirname, "src"),
    };
  },
  async onSuccess() {
    copyFileSync("src/styles.css", "dist/styles.css");
  },
});

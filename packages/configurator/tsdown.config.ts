import { defineConfig } from "tsdown";
import path from "node:path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: "dist",
  // Preserve the .js/.d.ts artifact names the published exports map points at.
  fixedExtension: false,
  external: ["react", "react-dom"],
  alias: {
    "@": path.resolve(import.meta.dirname, "src"),
  },
  copy: [{ from: "src/styles.css", to: "dist" }],
});

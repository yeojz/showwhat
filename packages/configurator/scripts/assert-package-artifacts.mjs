import { existsSync } from "node:fs";

if (!existsSync("dist/styles.css")) {
  throw new Error("dist/styles.css is missing");
}

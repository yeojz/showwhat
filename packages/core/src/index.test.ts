import { describe, it, expect } from "vitest";
import { noConditionEvaluator, defaultCreateRegex } from "./index.js";

describe("noConditionEvaluator", () => {
  it("always returns false", async () => {
    const result = await noConditionEvaluator({
      condition: {},
      context: { env: "prod" },
      annotations: {},
      deps: {},
      depth: "",
      createRegex: defaultCreateRegex,
    });
    expect(result).toBe(false);
  });
});

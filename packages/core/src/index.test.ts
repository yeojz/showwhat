import { describe, it, expect } from "vitest";
import { noConditionEvaluator } from "./index.js";

describe("noConditionEvaluator", () => {
  it("always returns false", async () => {
    const result = await noConditionEvaluator({
      condition: {},
      context: { env: "prod" },
      annotations: {},
      depth: "",
    });
    expect(result).toBe(false);
  });
});

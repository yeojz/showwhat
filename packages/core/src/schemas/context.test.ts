import { describe, it, expect } from "vitest";
import { ContextSchema } from "./context.js";

describe("ContextSchema", () => {
  it("accepts nested record values", () => {
    const result = ContextSchema.safeParse({
      user: { name: "alice", age: 30, active: true },
    });
    expect(result.success).toBe(true);
  });

  it("accepts deeply nested record values", () => {
    const result = ContextSchema.safeParse({
      user: { profile: { tier: "pro" } },
    });
    expect(result.success).toBe(true);
  });
});

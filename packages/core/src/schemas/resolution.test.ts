import { describe, it, expect } from "vitest";
import { ResolutionSchema } from "./resolution.js";

describe("ResolutionSchema", () => {
  it("accepts resolution with nested variation and annotations", () => {
    expect(
      ResolutionSchema.safeParse({
        key: "checkout_v2",
        value: true,
        meta: {
          variation: {
            index: 0,
            conditionCount: 1,
          },
          annotations: {},
        },
      }).success,
    ).toBe(true);
  });

  it("accepts variation with optional id and description", () => {
    expect(
      ResolutionSchema.safeParse({
        key: "checkout_v2",
        value: true,
        meta: {
          variation: {
            index: 0,
            id: "var-1",
            description: "Production variant",
            conditionCount: 1,
          },
          annotations: { rollout: { bucket: 42 } },
        },
      }).success,
    ).toBe(true);
  });

  it("requires variation.conditionCount", () => {
    expect(
      ResolutionSchema.safeParse({
        key: "checkout_v2",
        value: false,
        meta: {
          variation: {
            index: 1,
          },
          annotations: {},
        },
      }).success,
    ).toBe(false);
  });

  it("drops top-level source", () => {
    const result = ResolutionSchema.safeParse({
      key: "checkout_v2",
      source: "condition",
      value: true,
      meta: {
        context: { env: "prod" },
        variation: {
          index: 0,
          conditionCount: 1,
        },
        annotations: {},
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect("source" in result.data).toBe(false);
    }
  });
});

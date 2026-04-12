import { describe, it, expect } from "vitest";
import {
  buildAndCondition,
  buildOrCondition,
  buildCheckAnnotationsCondition,
  buildCustomCondition,
} from "./condition-builders.js";

describe("buildAndCondition", () => {
  it("builds an AND condition without id", () => {
    const result = buildAndCondition([]);
    expect(result).toEqual({ type: "and", conditions: [] });
  });

  it("builds an AND condition with id", () => {
    const result = buildAndCondition([], "test-id");
    expect(result).toEqual({ id: "test-id", type: "and", conditions: [] });
  });

  it("builds an AND condition with child conditions", () => {
    const children = [{ type: "env" as const, op: "eq" as const, value: "prod" }];
    const result = buildAndCondition(children);
    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0]).toEqual(children[0]);
  });
});

describe("buildOrCondition", () => {
  it("builds an OR condition without id", () => {
    const result = buildOrCondition([]);
    expect(result).toEqual({ type: "or", conditions: [] });
  });

  it("builds an OR condition with id", () => {
    const result = buildOrCondition([], "test-id");
    expect(result).toEqual({ id: "test-id", type: "or", conditions: [] });
  });
});

describe("buildCheckAnnotationsCondition", () => {
  it("builds a checkAnnotations condition without id", () => {
    const result = buildCheckAnnotationsCondition([]);
    expect(result).toEqual({ type: "checkAnnotations", conditions: [] });
  });

  it("builds a checkAnnotations condition with id", () => {
    const result = buildCheckAnnotationsCondition([], "test-id");
    expect(result).toEqual({ id: "test-id", type: "checkAnnotations", conditions: [] });
  });

  it("builds a checkAnnotations condition with child conditions", () => {
    const children = [{ type: "number" as const, key: "bucket", op: "eq" as const, value: 42 }];
    const result = buildCheckAnnotationsCondition(children);
    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0]).toEqual(children[0]);
  });
});

describe("buildCustomCondition", () => {
  it("builds a custom condition from arbitrary fields", () => {
    const result = buildCustomCondition({ type: "myType", key: "foo", value: "bar" });
    expect(result).toEqual({ type: "myType", key: "foo", value: "bar" });
  });
});

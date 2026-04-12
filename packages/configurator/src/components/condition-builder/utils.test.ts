import { describe, it, expect } from "vitest";
import {
  buildDefaultCondition,
  buildAndCondition,
  buildOrCondition,
  buildCheckAnnotationsCondition,
  buildCustomCondition,
} from "./utils.js";

describe("buildDefaultCondition", () => {
  it("builds an AND condition when type is 'and'", () => {
    const result = buildDefaultCondition("and");
    expect(result).toEqual({ type: "and", conditions: [] });
  });

  it("builds an AND condition with an id", () => {
    const result = buildDefaultCondition("and", "my-id");
    expect(result).toEqual({ id: "my-id", type: "and", conditions: [] });
  });

  it("builds an OR condition when type is 'or'", () => {
    const result = buildDefaultCondition("or");
    expect(result).toEqual({ type: "or", conditions: [] });
  });

  it("builds an OR condition with an id", () => {
    const result = buildDefaultCondition("or", "my-id");
    expect(result).toEqual({ id: "my-id", type: "or", conditions: [] });
  });

  it("builds a checkAnnotations condition when type is 'checkAnnotations'", () => {
    const result = buildDefaultCondition("checkAnnotations");
    expect(result).toEqual({ type: "checkAnnotations", conditions: [] });
  });

  it("builds a checkAnnotations condition with an id", () => {
    const result = buildDefaultCondition("checkAnnotations", "my-id");
    expect(result).toEqual({ id: "my-id", type: "checkAnnotations", conditions: [] });
  });

  it("builds a custom condition when type is '__custom'", () => {
    const result = buildDefaultCondition("__custom");
    expect(result).toEqual({ type: "" });
  });

  it("builds a custom condition with an id when type is '__custom'", () => {
    const result = buildDefaultCondition("__custom", "my-id");
    expect(result).toEqual({ type: "", id: "my-id" });
  });

  it("builds a default condition from a registered built-in type", () => {
    const result = buildDefaultCondition("string");
    expect(result).toEqual(expect.objectContaining({ type: "string" }));
  });

  it("builds a default condition from a registered built-in type with id", () => {
    const result = buildDefaultCondition("string", "my-id");
    expect(result).toEqual(expect.objectContaining({ type: "string", id: "my-id" }));
  });

  it("builds a default condition for each built-in type", () => {
    for (const type of ["string", "number", "datetime", "bool", "env", "startAt", "endAt"]) {
      const result = buildDefaultCondition(type);
      expect(result).toEqual(expect.objectContaining({ type }));
    }
  });

  it("falls back to empty custom condition for unknown types", () => {
    const result = buildDefaultCondition("unknownType");
    expect(result).toEqual({ type: "" });
  });

  it("falls back to empty custom condition with id for unknown types", () => {
    const result = buildDefaultCondition("unknownType", "my-id");
    expect(result).toEqual({ type: "", id: "my-id" });
  });

  it("builds a condition from extraTypes when type is not built-in", () => {
    const extraTypes = [
      {
        type: "customExtra",
        label: "Custom Extra",
        description: "A custom condition",
        defaults: { type: "customExtra", key: "", op: "eq", value: "" },
      },
    ];
    const result = buildDefaultCondition("customExtra", undefined, extraTypes);
    expect(result).toEqual(expect.objectContaining({ type: "customExtra" }));
  });

  it("builds a condition from extraTypes with an id", () => {
    const extraTypes = [
      {
        type: "customExtra",
        label: "Custom Extra",
        description: "A custom condition",
        defaults: { type: "customExtra", key: "", op: "eq", value: "" },
      },
    ];
    const result = buildDefaultCondition("customExtra", "my-id", extraTypes);
    expect(result).toEqual(expect.objectContaining({ type: "customExtra", id: "my-id" }));
  });

  it("falls back when extraTypes is provided but type is not found in it", () => {
    const extraTypes = [
      {
        type: "other",
        label: "Other",
        description: "",
        defaults: { type: "other" },
      },
    ];
    const result = buildDefaultCondition("unknownType", undefined, extraTypes);
    expect(result).toEqual({ type: "" });
  });

  it("falls back when extraTypes is an empty array", () => {
    const result = buildDefaultCondition("unknownType", undefined, []);
    expect(result).toEqual({ type: "" });
  });
});

describe("re-exported builders", () => {
  it("re-exports buildAndCondition", () => {
    expect(buildAndCondition).toBeTypeOf("function");
    expect(buildAndCondition([])).toEqual({ type: "and", conditions: [] });
  });

  it("re-exports buildOrCondition", () => {
    expect(buildOrCondition).toBeTypeOf("function");
    expect(buildOrCondition([])).toEqual({ type: "or", conditions: [] });
  });

  it("re-exports buildCheckAnnotationsCondition", () => {
    expect(buildCheckAnnotationsCondition).toBeTypeOf("function");
    expect(buildCheckAnnotationsCondition([])).toEqual({
      type: "checkAnnotations",
      conditions: [],
    });
  });

  it("re-exports buildCustomCondition", () => {
    expect(buildCustomCondition).toBeTypeOf("function");
    expect(buildCustomCondition({ type: "test" })).toEqual({ type: "test" });
  });
});

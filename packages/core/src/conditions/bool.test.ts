import { describe, it, expect } from "vitest";
import { evaluateBool as evaluate, boolEvaluator } from "./bool.js";

describe("bool (eq op)", () => {
  it("returns true when context value is true and condition value is true", async () => {
    expect(
      await evaluate({ type: "bool", key: "flag", op: "eq", value: true }, { flag: true }),
    ).toBe(true);
  });

  it("returns false when context value is true and condition value is false", async () => {
    expect(
      await evaluate({ type: "bool", key: "flag", op: "eq", value: false }, { flag: true }),
    ).toBe(false);
  });

  it("returns true when context value is false and condition value is false", async () => {
    expect(
      await evaluate({ type: "bool", key: "flag", op: "eq", value: false }, { flag: false }),
    ).toBe(true);
  });

  it("returns false when context value is false and condition value is true", async () => {
    expect(
      await evaluate({ type: "bool", key: "flag", op: "eq", value: true }, { flag: false }),
    ).toBe(false);
  });
});

describe("bool string coercion", () => {
  it("coerces string 'true' to boolean true", async () => {
    expect(
      await evaluate({ type: "bool", key: "flag", op: "eq", value: true }, { flag: "true" }),
    ).toBe(true);
  });

  it("coerces string 'false' to boolean false", async () => {
    expect(
      await evaluate({ type: "bool", key: "flag", op: "eq", value: false }, { flag: "false" }),
    ).toBe(true);
  });

  it("returns false when string is not 'true' or 'false'", async () => {
    expect(
      await evaluate({ type: "bool", key: "flag", op: "eq", value: true }, { flag: "yes" }),
    ).toBe(false);
  });

  it("returns false for numeric string '1'", async () => {
    expect(
      await evaluate({ type: "bool", key: "flag", op: "eq", value: true }, { flag: "1" }),
    ).toBe(false);
  });
});

describe("bool edge cases", () => {
  it("returns false when context key is missing", async () => {
    expect(await evaluate({ type: "bool", key: "flag", op: "eq", value: true }, {})).toBe(false);
  });

  it("returns false when context value is neither boolean nor string", async () => {
    expect(await evaluate({ type: "bool", key: "flag", op: "eq", value: true }, { flag: 1 })).toBe(
      false,
    );
  });
});

describe("boolEvaluator", () => {
  it("delegates to evaluateBool", async () => {
    expect(
      await boolEvaluator({
        condition: { type: "bool", key: "flag", op: "eq", value: true },
        context: { flag: true },
        annotations: {},
      }),
    ).toBe(true);
  });
});

describe("bool (op omitted)", () => {
  it("treats missing op as 'eq' and returns true when values match", async () => {
    expect(await evaluate({ type: "bool", key: "flag", value: true }, { flag: true })).toBe(true);
  });

  it("treats missing op as 'eq' and returns false when values differ", async () => {
    expect(await evaluate({ type: "bool", key: "flag", value: false }, { flag: true })).toBe(false);
  });
});

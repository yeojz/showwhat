import { describe, it, expect } from "vitest";
import { evaluateEnv as evaluate } from "./env.js";

describe("env (eq op)", () => {
  it("returns true when context env matches a single string value", async () => {
    expect(
      await evaluate({ type: "env", op: "eq", value: "production" }, { env: "production" }),
    ).toBe(true);
  });

  it("returns false when context env does not match a single string value", async () => {
    expect(await evaluate({ type: "env", op: "eq", value: "production" }, { env: "staging" })).toBe(
      false,
    );
  });

  it("returns true when context env matches one of an array of values", async () => {
    expect(
      await evaluate(
        { type: "env", op: "eq", value: ["production", "staging"] },
        { env: "staging" },
      ),
    ).toBe(true);
  });

  it("returns false when context env matches none of an array of values", async () => {
    expect(
      await evaluate(
        { type: "env", op: "eq", value: ["production", "staging"] },
        { env: "development" },
      ),
    ).toBe(false);
  });

  it("is case-sensitive", async () => {
    expect(
      await evaluate({ type: "env", op: "eq", value: "Production" }, { env: "production" }),
    ).toBe(false);
  });

  it("does not do substring matching", async () => {
    expect(await evaluate({ type: "env", op: "eq", value: "production" }, { env: "prod" })).toBe(
      false,
    );
  });
});

describe("env missing key", () => {
  it("returns false when context has no 'env' key", async () => {
    expect(await evaluate({ type: "env", op: "eq", value: "production" }, {})).toBe(false);
  });

  it("returns false when context has no 'env' key and value is an array", async () => {
    expect(await evaluate({ type: "env", op: "eq", value: ["production", "staging"] }, {})).toBe(
      false,
    );
  });
});

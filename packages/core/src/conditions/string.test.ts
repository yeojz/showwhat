import { describe, it, expect } from "vitest";
import { evaluateString as evaluate } from "./string.js";

describe("string (eq op)", () => {
  it("returns true when context key matches a single string value", async () => {
    expect(await evaluate({ type: "string", key: "x", op: "eq", value: "foo" }, { x: "foo" })).toBe(
      true,
    );
  });

  it("returns false when context key is absent", async () => {
    expect(await evaluate({ type: "string", key: "x", op: "eq", value: "foo" }, {})).toBe(false);
  });

  it("returns false when context key does not match", async () => {
    expect(await evaluate({ type: "string", key: "x", op: "eq", value: "foo" }, { x: "baz" })).toBe(
      false,
    );
  });
});

describe("string (neq op)", () => {
  it("returns true when context key does not match single value", async () => {
    expect(
      await evaluate({ type: "string", key: "x", op: "neq", value: "foo" }, { x: "bar" }),
    ).toBe(true);
  });

  it("returns false when context key matches single value", async () => {
    expect(
      await evaluate({ type: "string", key: "x", op: "neq", value: "foo" }, { x: "foo" }),
    ).toBe(false);
  });
});

describe("string (regex op)", () => {
  it("returns true when context key matches a single regex pattern", async () => {
    expect(
      await evaluate(
        { type: "string", key: "x", op: "regex", value: "^hello-" },
        { x: "hello-world" },
      ),
    ).toBe(true);
  });

  it("returns false for invalid regex (defense-in-depth)", async () => {
    expect(
      await evaluate(
        { type: "string", key: "x", op: "regex", value: "[invalid" },
        { x: "anything" },
      ),
    ).toBe(false);
  });

  it("returns false when no pattern matches", async () => {
    expect(
      await evaluate({ type: "string", key: "x", op: "regex", value: "^foo" }, { x: "bar-thing" }),
    ).toBe(false);
  });
});

describe("string (in op)", () => {
  it("returns true when context key matches one of the values", async () => {
    expect(
      await evaluate({ type: "string", key: "x", op: "in", value: ["foo", "bar"] }, { x: "bar" }),
    ).toBe(true);
  });

  it("returns false when context key matches none of the values", async () => {
    expect(
      await evaluate({ type: "string", key: "x", op: "in", value: ["foo", "bar"] }, { x: "baz" }),
    ).toBe(false);
  });

  it("returns false when context key is absent", async () => {
    expect(await evaluate({ type: "string", key: "x", op: "in", value: ["foo"] }, {})).toBe(false);
  });
});

describe("string (nin op)", () => {
  it("returns true when context key matches none of the values", async () => {
    expect(
      await evaluate({ type: "string", key: "x", op: "nin", value: ["foo", "bar"] }, { x: "baz" }),
    ).toBe(true);
  });

  it("returns false when context key matches one of the values", async () => {
    expect(
      await evaluate({ type: "string", key: "x", op: "nin", value: ["foo", "bar"] }, { x: "foo" }),
    ).toBe(false);
  });

  it("returns false when context key is absent", async () => {
    expect(await evaluate({ type: "string", key: "x", op: "nin", value: ["foo"] }, {})).toBe(false);
  });
});

describe("prototype pollution safety", () => {
  it("returns false when condition.key is __proto__", async () => {
    expect(
      await evaluate({ type: "string", key: "__proto__", op: "eq", value: "[object Object]" }, {}),
    ).toBe(false);
  });

  it("returns false when condition.key is constructor", async () => {
    expect(
      await evaluate(
        { type: "string", key: "constructor", op: "regex", value: "function Object" },
        {},
      ),
    ).toBe(false);
  });

  it("returns false when condition.key is prototype", async () => {
    expect(
      await evaluate({ type: "string", key: "prototype", op: "eq", value: "anything" }, {}),
    ).toBe(false);
  });

  it("returns false for __proto__ set via object literal (Object.hasOwn returns false)", async () => {
    expect(
      await evaluate({ type: "string", key: "__proto__", op: "eq", value: "safe" }, {
        __proto__: "safe",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    ).toBe(false);
  });
});

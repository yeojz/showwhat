import { describe, it, expect } from "vitest";
import { evaluateNumber as evaluate, numberEvaluator } from "./number.js";
import { defaultCreateRegex } from "./types.js";

describe("number (eq op)", () => {
  it("returns true when context value equals condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "eq", value: 42 }, { x: 42 })).toBe(true);
  });

  it("returns false when context value does not equal condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "eq", value: 42 }, { x: 43 })).toBe(
      false,
    );
  });
});

describe("number (neq op)", () => {
  it("returns true when context value does not equal condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "neq", value: 42 }, { x: 99 })).toBe(
      true,
    );
  });

  it("returns false when context value equals condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "neq", value: 42 }, { x: 42 })).toBe(
      false,
    );
  });
});

describe("number (gt op)", () => {
  it("returns true when context value is greater than condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "gt", value: 10 }, { x: 11 })).toBe(true);
  });

  it("returns false when context value equals condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "gt", value: 10 }, { x: 10 })).toBe(
      false,
    );
  });
});

describe("number (gte op)", () => {
  it("returns true when context value equals condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "gte", value: 10 }, { x: 10 })).toBe(
      true,
    );
  });

  it("returns true when context value is greater than condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "gte", value: 10 }, { x: 11 })).toBe(
      true,
    );
  });

  it("returns false when context value is less than condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "gte", value: 10 }, { x: 9 })).toBe(
      false,
    );
  });
});

describe("number (lt op)", () => {
  it("returns true when context value is less than condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "lt", value: 10 }, { x: 9 })).toBe(true);
  });

  it("returns false when context value equals condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "lt", value: 10 }, { x: 10 })).toBe(
      false,
    );
  });
});

describe("number (lte op)", () => {
  it("returns true when context value equals condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "lte", value: 10 }, { x: 10 })).toBe(
      true,
    );
  });

  it("returns true when context value is less than condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "lte", value: 10 }, { x: 9 })).toBe(true);
  });

  it("returns false when context value is greater than condition value", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "lte", value: 10 }, { x: 11 })).toBe(
      false,
    );
  });
});

describe("number (in op)", () => {
  it("returns true when context value is in the array", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "in", value: [1, 2, 3] }, { x: 2 })).toBe(
      true,
    );
  });

  it("returns false when context value is not in the array", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "in", value: [1, 2, 3] }, { x: 4 })).toBe(
      false,
    );
  });

  it("returns true when context value matches after coercion", async () => {
    expect(
      await evaluate({ type: "number", key: "x", op: "in", value: [200, 201, 204] }, { x: "200" }),
    ).toBe(true);
  });
});

describe("number (nin op)", () => {
  it("returns true when context value is not in the array", async () => {
    expect(
      await evaluate({ type: "number", key: "x", op: "nin", value: [1, 2, 3] }, { x: 4 }),
    ).toBe(true);
  });

  it("returns false when context value is in the array", async () => {
    expect(
      await evaluate({ type: "number", key: "x", op: "nin", value: [1, 2, 3] }, { x: 2 }),
    ).toBe(false);
  });
});

describe("number coercion", () => {
  it("coerces string '42' to number 42 for eq", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "eq", value: 42 }, { x: "42" })).toBe(
      true,
    );
  });

  it("coerces string '9' correctly for lt", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "lt", value: 10 }, { x: "9" })).toBe(
      true,
    );
  });

  it("returns false when string is not a valid number (NaN)", async () => {
    expect(
      await evaluate({ type: "number", key: "x", op: "eq", value: 42 }, { x: "not-a-number" }),
    ).toBe(false);
  });
});

describe("number type guard", () => {
  it("returns false when context value is a boolean", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "eq", value: 1 }, { x: true })).toBe(
      false,
    );
  });

  it("returns false when context value is an array", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "eq", value: 42 }, { x: [42] })).toBe(
      false,
    );
  });

  it("returns false when context value is an object", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "eq", value: 0 }, { x: { n: 0 } })).toBe(
      false,
    );
  });
});

describe("numberEvaluator", () => {
  it("delegates to evaluateNumber", async () => {
    expect(
      await numberEvaluator({
        condition: { type: "number", key: "count", op: "eq", value: 5 },
        context: { count: 5 },
        annotations: {},
        deps: {},
        depth: "",
        createRegex: defaultCreateRegex,
      }),
    ).toBe(true);
  });
});

describe("number edge cases", () => {
  it("returns false when context key is missing", async () => {
    expect(await evaluate({ type: "number", key: "x", op: "eq", value: 42 }, {})).toBe(false);
  });
});

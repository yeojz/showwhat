import { describe, it, expect } from "vitest";
import {
  ConditionSchema,
  BuiltinConditionSchema,
  StringConditionSchema,
  NumberConditionSchema,
  isAndCondition,
  isOrCondition,
  isCheckAnnotationsCondition,
} from "./condition.js";
import type { Condition } from "./condition.js";

describe("ConditionSchema", () => {
  it("accepts valid env condition with string", () => {
    expect(ConditionSchema.safeParse({ type: "env", op: "eq", value: "prod" }).success).toBe(true);
  });

  it("accepts valid env condition with array", () => {
    expect(
      ConditionSchema.safeParse({ type: "env", op: "eq", value: ["prod", "staging"] }).success,
    ).toBe(true);
  });

  it("accepts valid startAt condition", () => {
    expect(
      ConditionSchema.safeParse({ type: "startAt", value: "2026-01-01T00:00:00Z" }).success,
    ).toBe(true);
  });

  it("accepts valid string condition", () => {
    expect(
      ConditionSchema.safeParse({ type: "string", key: "region", op: "eq", value: "us-east-1" })
        .success,
    ).toBe(true);
  });

  it("accepts valid number condition", () => {
    expect(
      ConditionSchema.safeParse({ type: "number", key: "score", op: "gte", value: 80 }).success,
    ).toBe(true);
  });

  it("accepts valid bool condition", () => {
    expect(
      ConditionSchema.safeParse({ type: "bool", key: "enabled", op: "eq", value: true }).success,
    ).toBe(true);
  });

  it("accepts unknown condition type (custom conditions pass through)", () => {
    expect(ConditionSchema.safeParse({ type: "percent", value: 50 }).success).toBe(true);
  });

  it("BuiltinConditionSchema rejects unknown condition type", () => {
    expect(BuiltinConditionSchema.safeParse({ type: "percent", value: 50 }).success).toBe(false);
  });

  it("rejects invalid ISO date in endAt", () => {
    expect(ConditionSchema.safeParse({ type: "endAt", value: "tomorrow" }).success).toBe(false);
  });

  it("accepts env condition with empty array (no min constraint on env value)", () => {
    expect(ConditionSchema.safeParse({ type: "env", op: "eq", value: [] }).success).toBe(true);
  });

  it("rejects string condition missing key", () => {
    expect(ConditionSchema.safeParse({ type: "string", op: "eq", value: "foo" }).success).toBe(
      false,
    );
  });

  it("rejects string condition missing op", () => {
    expect(ConditionSchema.safeParse({ type: "string", key: "x", value: "foo" }).success).toBe(
      false,
    );
  });

  it("accepts valid checkAnnotations condition", () => {
    const result = ConditionSchema.safeParse({
      type: "checkAnnotations",
      conditions: [{ type: "string", key: "source", op: "eq", value: "rollout" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects checkAnnotations condition with empty conditions array", () => {
    expect(ConditionSchema.safeParse({ type: "checkAnnotations", conditions: [] }).success).toBe(
      false,
    );
  });

  it("rejects checkAnnotations condition without conditions field", () => {
    expect(ConditionSchema.safeParse({ type: "checkAnnotations" }).success).toBe(false);
  });

  it("rejects { type: 'withAnnotations' } as a custom condition (reserved)", () => {
    // The open-union arm must not match reserved types
    const result = ConditionSchema.safeParse({ type: "checkAnnotations", foo: "bar" });
    expect(result.success).toBe(false);
  });

  it("accepts string condition with invalid regex pattern (validation deferred to resolve time)", () => {
    const result = ConditionSchema.safeParse({
      type: "string",
      key: "name",
      op: "regex",
      value: "[invalid",
    });
    expect(result.success).toBe(true);
  });

  it("rejects regex op with array value", () => {
    const result = ConditionSchema.safeParse({
      type: "string",
      key: "name",
      op: "regex",
      value: ["valid.*", "[invalid"],
    });
    expect(result.success).toBe(false);
  });
});

describe("StringConditionSchema", () => {
  it("accepts eq op with string value", () => {
    const result = StringConditionSchema.safeParse({
      type: "string",
      key: "region",
      op: "eq",
      value: "us-east-1",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.op).toBe("eq");
  });

  it("accepts neq op", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "env",
        op: "neq",
        value: "dev",
      }).success,
    ).toBe(true);
  });

  it("accepts regex op", () => {
    const result = StringConditionSchema.safeParse({
      type: "string",
      key: "tenant",
      op: "regex",
      value: "^acme-.*",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing key", () => {
    expect(
      StringConditionSchema.safeParse({ type: "string", op: "eq", value: "prod" }).success,
    ).toBe(false);
  });

  it("rejects missing value", () => {
    expect(StringConditionSchema.safeParse({ type: "string", key: "env", op: "eq" }).success).toBe(
      false,
    );
  });

  it("rejects missing op", () => {
    expect(
      StringConditionSchema.safeParse({ type: "string", key: "env", value: "prod" }).success,
    ).toBe(false);
  });

  it("rejects invalid op", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "env",
        op: "exact",
        value: "prod",
      }).success,
    ).toBe(false);
  });

  it("accepts in op with array value", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "region",
        op: "in",
        value: ["us-east-1", "us-west-2"],
      }).success,
    ).toBe(true);
  });

  it("accepts nin op with array value", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "region",
        op: "nin",
        value: ["eu-central-1"],
      }).success,
    ).toBe(true);
  });

  it("rejects eq op with array value", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "env",
        op: "eq",
        value: ["prod", "staging"],
      }).success,
    ).toBe(false);
  });

  it("rejects in op with string value", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "region",
        op: "in",
        value: "us-east-1",
      }).success,
    ).toBe(false);
  });

  it("rejects regex op with array value", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "region",
        op: "regex",
        value: ["^us-", "^eu-"],
      }).success,
    ).toBe(false);
  });
});

describe("NumberConditionSchema", () => {
  it("accepts eq op with number value", () => {
    expect(
      NumberConditionSchema.safeParse({
        type: "number",
        key: "score",
        op: "eq",
        value: 42,
      }).success,
    ).toBe(true);
  });

  it("accepts in op with array value", () => {
    expect(
      NumberConditionSchema.safeParse({
        type: "number",
        key: "score",
        op: "in",
        value: [1, 2, 3],
      }).success,
    ).toBe(true);
  });

  it("accepts nin op with array value", () => {
    expect(
      NumberConditionSchema.safeParse({
        type: "number",
        key: "score",
        op: "nin",
        value: [10, 20],
      }).success,
    ).toBe(true);
  });

  it("rejects in op with non-array value", () => {
    const result = NumberConditionSchema.safeParse({
      type: "number",
      key: "k",
      op: "in",
      value: 42,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes('"in" operator requires an array value'),
        ),
      ).toBe(true);
    }
  });

  it("rejects nin op with non-array value", () => {
    const result = NumberConditionSchema.safeParse({
      type: "number",
      key: "k",
      op: "nin",
      value: 7,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes('"nin" operator requires an array value'),
        ),
      ).toBe(true);
    }
  });

  it("rejects eq op with array value", () => {
    const result = NumberConditionSchema.safeParse({
      type: "number",
      key: "k",
      op: "eq",
      value: [1, 2],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes('"eq" operator requires a number value'),
        ),
      ).toBe(true);
    }
  });

  it("rejects gt op with array value", () => {
    const result = NumberConditionSchema.safeParse({
      type: "number",
      key: "k",
      op: "gt",
      value: [5],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes('"gt" operator requires a number value'),
        ),
      ).toBe(true);
    }
  });
});

describe("condition type guards", () => {
  const and: Condition = {
    type: "and",
    conditions: [{ type: "string", key: "k", op: "eq", value: "v" }],
  };
  const or: Condition = {
    type: "or",
    conditions: [{ type: "string", key: "k", op: "eq", value: "v" }],
  };
  const checkAnnotations: Condition = {
    type: "checkAnnotations",
    conditions: [{ type: "string", key: "k", op: "eq", value: "v" }],
  };
  const string: Condition = { type: "string", key: "k", op: "eq", value: "v" };

  it("isAndCondition returns true for and conditions", () => {
    expect(isAndCondition(and)).toBe(true);
  });

  it("isAndCondition returns false for non-and conditions", () => {
    expect(isAndCondition(or)).toBe(false);
    expect(isAndCondition(string)).toBe(false);
  });

  it("isOrCondition returns true for or conditions", () => {
    expect(isOrCondition(or)).toBe(true);
  });

  it("isOrCondition returns false for non-or conditions", () => {
    expect(isOrCondition(and)).toBe(false);
    expect(isOrCondition(string)).toBe(false);
  });

  it("isCheckAnnotationsCondition returns true for checkAnnotations conditions", () => {
    expect(isCheckAnnotationsCondition(checkAnnotations)).toBe(true);
  });

  it("isCheckAnnotationsCondition returns false for non-checkAnnotations conditions", () => {
    expect(isCheckAnnotationsCondition(and)).toBe(false);
    expect(isCheckAnnotationsCondition(string)).toBe(false);
  });
});

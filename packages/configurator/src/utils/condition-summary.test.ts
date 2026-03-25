import { describe, it, expect } from "vitest";
import type { Condition } from "@showwhat/core/schemas";
import { formatConditionSummary } from "./condition-summary.js";

describe("formatConditionSummary", () => {
  it("returns null for empty conditions array", () => {
    expect(formatConditionSummary([])).toBeNull();
  });

  it("formats a single env condition", () => {
    const conditions: Condition[] = [{ type: "env", op: "eq", value: "production" }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("When");
    expect(result).toContain('"production"');
  });

  it("formats multiple top-level conditions with AND separators", () => {
    const conditions: Condition[] = [
      { type: "env", op: "eq", value: "production" },
      { type: "string", key: "region", op: "eq", value: "us" },
    ];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("AND");
    expect(result).toContain("region");
    expect(result).toContain('"us"');
  });

  it("formats a string condition with eq operator", () => {
    const conditions: Condition[] = [{ type: "string", key: "userId", op: "eq", value: "abc" }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("userId");
    expect(result).toContain("=");
    expect(result).toContain('"abc"');
  });

  it("formats a string condition with neq operator", () => {
    const conditions: Condition[] = [{ type: "string", key: "userId", op: "neq", value: "abc" }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("!=");
  });

  it("formats a string condition with regex operator", () => {
    const conditions: Condition[] = [
      { type: "string", key: "email", op: "regex", value: "^test.*" },
    ];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("~");
    expect(result).toContain("/^test.*/");
  });

  it("formats a string condition with array values", () => {
    const conditions: Condition[] = [
      { type: "string", key: "userId", op: "eq", value: ["a", "b"] },
    ];
    const result = formatConditionSummary(conditions);
    expect(result).toContain('"a"');
    expect(result).toContain('"b"');
  });

  it("formats env condition with array values", () => {
    const conditions: Condition[] = [{ type: "env", op: "eq", value: ["production", "staging"] }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain('"production"');
    expect(result).toContain('"staging"');
  });

  it("formats env condition with regex operator", () => {
    const conditions: Condition[] = [{ type: "env", op: "regex", value: "^prod.*" }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("~");
    expect(result).toContain("/^prod.*/");
  });

  it("formats a number condition", () => {
    const conditions: Condition[] = [{ type: "number", key: "score", op: "gt", value: 100 }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("score");
    expect(result).toContain(">");
    expect(result).toContain("100");
  });

  it("formats a number condition with gte operator", () => {
    const conditions: Condition[] = [{ type: "number", key: "score", op: "gte", value: 50 }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain(">=");
  });

  it("formats a number condition with lt operator", () => {
    const conditions: Condition[] = [{ type: "number", key: "score", op: "lt", value: 10 }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("<");
  });

  it("formats a number condition with lte operator", () => {
    const conditions: Condition[] = [{ type: "number", key: "score", op: "lte", value: 10 }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("<=");
  });

  it("formats a bool condition", () => {
    const conditions: Condition[] = [{ type: "bool", key: "isAdmin", value: true }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("isAdmin");
    expect(result).toContain("=");
    expect(result).toContain("true");
  });

  it("formats a datetime condition", () => {
    const conditions: Condition[] = [
      { type: "datetime", key: "at", op: "eq", value: "2025-01-01T00:00:00Z" },
    ];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("at");
    expect(result).toContain("=");
    expect(result).toContain('"2025-01-01T00:00:00Z"');
  });

  it("formats a startAt condition", () => {
    const conditions: Condition[] = [
      { type: "startAt", value: "2025-01-01T00:00:00Z" } as Condition,
    ];
    const result = formatConditionSummary(conditions);
    expect(result).toContain(">=");
    expect(result).toContain('"2025-01-01T00:00:00Z"');
  });

  it("formats an endAt condition", () => {
    const conditions: Condition[] = [{ type: "endAt", value: "2025-12-31T23:59:59Z" } as Condition];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("<");
    expect(result).toContain('"2025-12-31T23:59:59Z"');
  });

  it("formats an AND group", () => {
    const conditions: Condition[] = [
      {
        type: "and",
        conditions: [
          { type: "env", op: "eq", value: "prod" },
          { type: "string", key: "region", op: "eq", value: "us" },
        ],
      },
    ];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("AND");
    expect(result).toContain("(");
    expect(result).toContain(")");
  });

  it("formats an empty AND group", () => {
    const conditions: Condition[] = [{ type: "and", conditions: [] }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("(empty AND group)");
  });

  it("formats an OR group", () => {
    const conditions: Condition[] = [
      {
        type: "or",
        conditions: [
          { type: "env", op: "eq", value: "prod" },
          { type: "env", op: "eq", value: "staging" },
        ],
      },
    ];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("OR");
  });

  it("formats an empty OR group", () => {
    const conditions: Condition[] = [{ type: "or", conditions: [] }];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("(empty OR group)");
  });

  it("formats a custom condition with value but no key", () => {
    const conditions: Condition[] = [{ type: "myCustom", value: "something" } as Condition];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("myCustom");
    expect(result).toContain('"something"');
  });

  it("formats a custom condition with no key and no value", () => {
    const conditions: Condition[] = [{ type: "myCustom" } as Condition];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("myCustom");
  });

  it("formats a custom condition with key and value", () => {
    const conditions: Condition[] = [{ type: "myCustom", key: "foo", value: "bar" } as Condition];
    const result = formatConditionSummary(conditions);
    expect(result).toContain("foo");
    expect(result).toContain('"bar"');
  });

  it("uses unknown operator symbol when op is unrecognized", () => {
    const conditions: Condition[] = [
      { type: "string", key: "k", op: "unknownOp", value: "v" } as Condition,
    ];
    const result = formatConditionSummary(conditions);
    // Falls through to default "=" symbol
    expect(result).toContain("=");
  });
});

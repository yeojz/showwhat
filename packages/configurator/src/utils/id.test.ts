import { describe, expect, it } from "vitest";
import type { Condition, Definitions } from "@showwhat/core/schemas";
import { AUTO_ID_PREFIX, ensureIds, isAutoId, stripAutoIds } from "./id.js";

describe("isAutoId", () => {
  it("returns true for prefixed IDs", () => {
    expect(isAutoId(`${AUTO_ID_PREFIX}abc`)).toBe(true);
  });

  it("returns false for user-set IDs", () => {
    expect(isAutoId("my-custom-id")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAutoId(undefined)).toBe(false);
  });
});

describe("ensureIds", () => {
  it("assigns prefixed IDs to items without IDs", () => {
    const items = [{ type: "string", key: "a", op: "eq", value: "x" }];
    const result = ensureIds(items);
    expect((result[0] as Record<string, unknown>).id).toMatch(new RegExp(`^${AUTO_ID_PREFIX}`));
  });

  it("preserves existing user-set IDs", () => {
    const items = [{ id: "user-id", type: "string", key: "a", op: "eq", value: "x" }];
    const result = ensureIds(items);
    expect(result[0].id).toBe("user-id");
    expect(result).toBe(items); // reference equality — no change
  });

  it("preserves existing auto-IDs (no double-prefix)", () => {
    const existing = `${AUTO_ID_PREFIX}some-uuid`;
    const items = [{ id: existing, type: "string", key: "a", op: "eq", value: "x" }];
    const result = ensureIds(items);
    expect(result[0].id).toBe(existing);
    expect(result).toBe(items);
  });
});

describe("stripAutoIds", () => {
  it("removes auto-IDs from definitions, variations, and conditions", () => {
    const defs: Definitions = {
      flag1: {
        id: `${AUTO_ID_PREFIX}def-id`,
        variations: [
          {
            id: `${AUTO_ID_PREFIX}var-id`,
            value: true,
            conditions: [
              { id: `${AUTO_ID_PREFIX}cond-id`, type: "env", value: "prod" } as Condition,
            ],
          },
        ],
      },
    };

    const result = stripAutoIds(defs);
    expect(result.flag1.id).toBeUndefined();
    expect(result.flag1.variations[0].id).toBeUndefined();
    expect(
      (result.flag1.variations[0].conditions![0] as Record<string, unknown>).id,
    ).toBeUndefined();
  });

  it("preserves user-set IDs", () => {
    const defs: Definitions = {
      flag1: {
        id: "user-def-id",
        variations: [
          {
            id: "user-var-id",
            value: true,
            conditions: [{ id: "user-cond-id", type: "env", value: "prod" } as Condition],
          },
        ],
      },
    };

    const result = stripAutoIds(defs);
    expect(result.flag1.id).toBe("user-def-id");
    expect(result.flag1.variations[0].id).toBe("user-var-id");
    expect((result.flag1.variations[0].conditions![0] as Record<string, unknown>).id).toBe(
      "user-cond-id",
    );
  });

  it("recurses into and/or groups", () => {
    const defs: Definitions = {
      flag1: {
        variations: [
          {
            value: true,
            conditions: [
              {
                id: `${AUTO_ID_PREFIX}and-id`,
                type: "and",
                conditions: [
                  { id: `${AUTO_ID_PREFIX}nested`, type: "env", value: "prod" } as Condition,
                  { id: "keep-me", type: "env", value: "staging" } as Condition,
                ],
              } as Condition,
            ],
          },
        ],
      },
    };

    const result = stripAutoIds(defs);
    const and = result.flag1.variations[0].conditions![0] as Record<string, unknown>;
    expect(and.id).toBeUndefined();
    const nested = (and.conditions as Condition[])[0] as Record<string, unknown>;
    expect(nested.id).toBeUndefined();
    const kept = (and.conditions as Condition[])[1] as Record<string, unknown>;
    expect(kept.id).toBe("keep-me");
  });

  it("strips auto-IDs from variations without conditions", () => {
    const defs: Definitions = {
      flag1: {
        id: `${AUTO_ID_PREFIX}def-id`,
        variations: [{ id: `${AUTO_ID_PREFIX}var-id`, value: true }],
      },
    };

    const result = stripAutoIds(defs);
    expect(result.flag1.id).toBeUndefined();
    expect(result.flag1.variations[0].id).toBeUndefined();
  });

  it("strips auto-IDs from OR groups recursively", () => {
    const defs: Definitions = {
      flag1: {
        variations: [
          {
            value: true,
            conditions: [
              {
                id: `${AUTO_ID_PREFIX}or-id`,
                type: "or",
                conditions: [
                  { id: `${AUTO_ID_PREFIX}nested`, type: "env", value: "prod" } as Condition,
                ],
              } as Condition,
            ],
          },
        ],
      },
    };

    const result = stripAutoIds(defs);
    const or = result.flag1.variations[0].conditions![0] as Record<string, unknown>;
    expect(or.id).toBeUndefined();
    const nested = (or.conditions as Condition[])[0] as Record<string, unknown>;
    expect(nested.id).toBeUndefined();
  });

  it("round-trips: ensureIds → stripAutoIds produces clean output", () => {
    const conditions: Condition[] = [
      { type: "env", value: "prod" } as Condition,
      { type: "string", key: "region", op: "eq", value: "us" } as Condition,
    ];
    const withIds = ensureIds(conditions);
    expect(withIds.every((c) => (c as Record<string, unknown>).id)).toBe(true);

    const defs: Definitions = {
      flag1: {
        variations: [{ value: true, conditions: withIds }],
      },
    };

    const result = stripAutoIds(defs);
    for (const c of result.flag1.variations[0].conditions!) {
      expect((c as Record<string, unknown>).id).toBeUndefined();
    }
  });
});

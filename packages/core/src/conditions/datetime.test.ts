import { describe, it, expect } from "vitest";
import { evaluateDatetime as evaluate, datetimeEvaluator } from "./datetime.js";
import { defaultCreateRegex } from "./types.js";

const PAST = "2020-01-01T00:00:00.000Z";
const FUTURE = "2099-01-01T00:00:00.000Z";
const MID = "2024-06-01T12:00:00.000Z";

describe("datetime (eq op)", () => {
  it("returns true when context value equals condition value exactly", async () => {
    expect(await evaluate({ type: "datetime", key: "at", op: "eq", value: MID }, { at: MID })).toBe(
      true,
    );
  });

  it("returns false when context value does not equal condition value", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "eq", value: MID }, { at: PAST }),
    ).toBe(false);
  });
});

describe("datetime (gt op)", () => {
  it("returns true when context value is after condition value", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "gt", value: PAST }, { at: MID }),
    ).toBe(true);
  });

  it("returns false when context value equals condition value", async () => {
    expect(await evaluate({ type: "datetime", key: "at", op: "gt", value: MID }, { at: MID })).toBe(
      false,
    );
  });
});

describe("datetime (gte op)", () => {
  it("returns true when context value equals condition value", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "gte", value: MID }, { at: MID }),
    ).toBe(true);
  });

  it("returns true when context value is after condition value", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "gte", value: PAST }, { at: MID }),
    ).toBe(true);
  });

  it("returns false when context value is before condition value", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "gte", value: FUTURE }, { at: MID }),
    ).toBe(false);
  });
});

describe("datetime (lt op)", () => {
  it("returns true when context value is before condition value", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "lt", value: FUTURE }, { at: MID }),
    ).toBe(true);
  });

  it("returns false when context value equals condition value", async () => {
    expect(await evaluate({ type: "datetime", key: "at", op: "lt", value: MID }, { at: MID })).toBe(
      false,
    );
  });
});

describe("datetime (lte op)", () => {
  it("returns true when context value equals condition value", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "lte", value: MID }, { at: MID }),
    ).toBe(true);
  });

  it("returns true when context value is before condition value", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "lte", value: FUTURE }, { at: MID }),
    ).toBe(true);
  });

  it("returns false when context value is after condition value", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "lte", value: PAST }, { at: MID }),
    ).toBe(false);
  });
});

describe("datetime missing 'at' key", () => {
  it("returns false when 'at' key is absent (gte)", async () => {
    expect(await evaluate({ type: "datetime", key: "at", op: "gte", value: PAST }, {})).toBe(false);
  });

  it("returns false when 'at' key is absent (lt)", async () => {
    expect(await evaluate({ type: "datetime", key: "at", op: "lt", value: FUTURE }, {})).toBe(
      false,
    );
  });
});

describe("datetime missing key", () => {
  it("returns false when non-'at' key is absent from context", async () => {
    expect(
      await evaluate({ type: "datetime", key: "scheduledAt", op: "gte", value: PAST }, {}),
    ).toBe(false);
  });
});

describe("datetimeEvaluator", () => {
  it("delegates to evaluateDatetime", async () => {
    expect(
      await datetimeEvaluator({
        condition: { type: "datetime", key: "at", op: "eq", value: "2025-01-01T00:00:00Z" },
        context: { at: "2025-01-01T00:00:00Z" },
        annotations: {},
        deps: {},
        depth: "",
        createRegex: defaultCreateRegex,
      }),
    ).toBe(true);
  });
});

describe("datetime type guard", () => {
  it("returns false when context value is an array", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "gte", value: PAST }, { at: [MID] }),
    ).toBe(false);
  });

  it("returns false when context value is a number", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "gte", value: PAST }, { at: 1234567890 }),
    ).toBe(false);
  });

  it("returns false when context value is a boolean", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "gte", value: PAST }, { at: true }),
    ).toBe(false);
  });

  it("returns false when context value is a nested object", async () => {
    expect(
      await evaluate({ type: "datetime", key: "at", op: "gte", value: PAST }, { at: { ts: MID } }),
    ).toBe(false);
  });
});

describe("datetime invalid context value", () => {
  it("throws InvalidContextError when context 'at' is not a valid date string", async () => {
    await expect(
      evaluate({ type: "datetime", key: "at", op: "gte", value: PAST }, { at: "not-a-date" }),
    ).rejects.toThrow('Invalid context value for "at": "not-a-date"');
  });

  it("throws InvalidContextError for offset timezone (+08:00)", async () => {
    await expect(
      evaluate(
        { type: "datetime", key: "at", op: "gte", value: PAST },
        { at: "2024-01-01T00:00:00+08:00" },
      ),
    ).rejects.toThrow('Invalid context value for "at"');
  });

  it("throws InvalidContextError for negative offset (-05:00)", async () => {
    await expect(
      evaluate(
        { type: "datetime", key: "at", op: "gte", value: PAST },
        { at: "2024-01-01T00:00:00-05:00" },
      ),
    ).rejects.toThrow('Invalid context value for "at"');
  });

  it("throws InvalidContextError for bare datetime without timezone", async () => {
    await expect(
      evaluate(
        { type: "datetime", key: "at", op: "gte", value: PAST },
        { at: "2024-01-01T00:00:00" },
      ),
    ).rejects.toThrow('Invalid context value for "at"');
  });

  it("throws InvalidContextError for date-only string", async () => {
    await expect(
      evaluate({ type: "datetime", key: "at", op: "gte", value: PAST }, { at: "2024-01-01" }),
    ).rejects.toThrow('Invalid context value for "at"');
  });
});

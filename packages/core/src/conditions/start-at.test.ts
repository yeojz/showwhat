import { describe, it, expect } from "vitest";
import { evaluateStartAt as evaluate } from "./start-at.js";

const PAST = "2020-01-01T00:00:00.000Z";
const FUTURE = "2099-01-01T00:00:00.000Z";

describe("startAt (via evaluate)", () => {
  // Happy path — current time is at or after the start date
  it("returns true when context 'at' is after the condition value", async () => {
    expect(
      await evaluate({ type: "startAt", value: PAST }, { at: "2024-06-01T00:00:00.000Z" }),
    ).toBe(true);
  });

  // Failure — current time is before the start date
  it("returns false when context 'at' is before the condition value", async () => {
    expect(
      await evaluate({ type: "startAt", value: FUTURE }, { at: "2024-06-01T00:00:00.000Z" }),
    ).toBe(false);
  });

  // Boundary — equal timestamps satisfy >= so should return true
  it("returns true when context 'at' equals the condition value exactly", async () => {
    const exact = "2024-06-01T12:00:00.000Z";
    expect(await evaluate({ type: "startAt", value: exact }, { at: exact })).toBe(true);
  });

  // One millisecond before the boundary
  it("returns false when context 'at' is one millisecond before the condition value", async () => {
    expect(
      await evaluate(
        { type: "startAt", value: "2024-06-01T12:00:00.000Z" },
        { at: "2024-06-01T11:59:59.999Z" },
      ),
    ).toBe(false);
  });

  // One millisecond after the boundary
  it("returns true when context 'at' is one millisecond after the condition value", async () => {
    expect(
      await evaluate(
        { type: "startAt", value: "2024-06-01T12:00:00.000Z" },
        { at: "2024-06-01T12:00:00.001Z" },
      ),
    ).toBe(true);
  });

  // No 'at' in context — falls back to current time (Date.now)
  it("returns true when context has no 'at' key and condition value is in the past", async () => {
    expect(await evaluate({ type: "startAt", value: PAST }, {})).toBe(true);
  });

  it("returns false when context has no 'at' key and condition value is in the future", async () => {
    expect(await evaluate({ type: "startAt", value: FUTURE }, {})).toBe(false);
  });

  // Invalid 'at' value throws InvalidContextError
  it("throws InvalidContextError when context 'at' is an invalid date string", async () => {
    await expect(evaluate({ type: "startAt", value: PAST }, { at: "not-a-date" })).rejects.toThrow(
      'Invalid context value for "at": "not-a-date"',
    );
  });
});

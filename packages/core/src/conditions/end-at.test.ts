import { describe, it, expect } from "vitest";
import { evaluateEndAt as evaluate } from "./end-at.js";

const PAST = "2020-01-01T00:00:00.000Z";
const FUTURE = "2099-01-01T00:00:00.000Z";

describe("endAt (via evaluate)", () => {
  // Happy path — current time is before the end date
  it("returns true when context 'at' is before the condition value", async () => {
    expect(
      await evaluate({ type: "endAt", value: FUTURE }, { at: "2024-06-01T00:00:00.000Z" }),
    ).toBe(true);
  });

  // Failure — current time is after the end date
  it("returns false when context 'at' is after the condition value", async () => {
    expect(await evaluate({ type: "endAt", value: PAST }, { at: "2024-06-01T00:00:00.000Z" })).toBe(
      false,
    );
  });

  // Boundary — equal timestamps are NOT before, so should return false
  it("returns false when context 'at' equals the condition value exactly", async () => {
    const exact = "2024-06-01T12:00:00.000Z";
    expect(await evaluate({ type: "endAt", value: exact }, { at: exact })).toBe(false);
  });

  // One millisecond before the boundary
  it("returns true when context 'at' is one millisecond before the condition value", async () => {
    expect(
      await evaluate(
        { type: "endAt", value: "2024-06-01T12:00:00.000Z" },
        { at: "2024-06-01T11:59:59.999Z" },
      ),
    ).toBe(true);
  });

  // One millisecond after the boundary
  it("returns false when context 'at' is one millisecond after the condition value", async () => {
    expect(
      await evaluate(
        { type: "endAt", value: "2024-06-01T12:00:00.000Z" },
        { at: "2024-06-01T12:00:00.001Z" },
      ),
    ).toBe(false);
  });

  // No 'at' in context — returns false (caller must provide 'at')
  it("returns false when context has no 'at' key", async () => {
    expect(await evaluate({ type: "endAt", value: FUTURE }, {})).toBe(false);
  });

  // Invalid 'at' value throws InvalidContextError
  it("throws InvalidContextError when context 'at' is an invalid date string", async () => {
    await expect(evaluate({ type: "endAt", value: FUTURE }, { at: "not-a-date" })).rejects.toThrow(
      'Invalid context value for "at": "not-a-date"',
    );
  });
});

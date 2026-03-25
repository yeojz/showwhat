import { describe, it, expect } from "vitest";
import { toShowwhatContext } from "./context.js";

describe("toShowwhatContext", () => {
  it("maps string, number, and boolean values", () => {
    const result = toShowwhatContext({
      env: "production",
      userId: 42,
      admin: true,
    });

    expect(result).toEqual({
      env: "production",
      userId: 42,
      admin: true,
    });
  });

  it("maps targetingKey as a string property", () => {
    const result = toShowwhatContext({ targetingKey: "user-123" });
    expect(result).toEqual({ targetingKey: "user-123" });
  });

  it("drops null values", () => {
    const result = toShowwhatContext({ name: "test", nothing: null });
    expect(result).toEqual({ name: "test" });
  });

  it("drops nested objects", () => {
    const result = toShowwhatContext({
      name: "test",
      nested: { deep: "value" },
    });
    expect(result).toEqual({ name: "test" });
  });

  it("drops arrays", () => {
    const result = toShowwhatContext({
      name: "test",
      tags: ["a", "b"],
    });
    expect(result).toEqual({ name: "test" });
  });

  it("drops Date values", () => {
    const result = toShowwhatContext({
      name: "test",
      createdAt: new Date("2024-01-01"),
    });
    expect(result).toEqual({ name: "test" });
  });

  it("returns empty context for empty input", () => {
    const result = toShowwhatContext({});
    expect(result).toEqual({});
  });
});

import { describe, it, expect, vi } from "vitest";
import type { Logger } from "showwhat";
import { toShowwhatContext } from "./context.js";

function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

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

  it("preserves primitive arrays", () => {
    const result = toShowwhatContext({
      name: "test",
      tags: ["a", "b"],
    });
    expect(result).toEqual({ name: "test", tags: ["a", "b"] });
  });

  it("preserves nested objects of primitives", () => {
    const result = toShowwhatContext({
      name: "test",
      nested: { deep: "value", count: 1 },
    });
    expect(result).toEqual({ name: "test", nested: { deep: "value", count: 1 } });
  });

  it("drops null values with warning", () => {
    const logger = createMockLogger();
    const result = toShowwhatContext({ name: "test", nothing: null }, logger);
    expect(result).toEqual({ name: "test" });
    expect(logger.warn).toHaveBeenCalledWith("dropped unsupported context key", {
      key: "nothing",
    });
  });

  it("drops Date values with warning", () => {
    const logger = createMockLogger();
    const result = toShowwhatContext({ name: "test", createdAt: new Date("2024-01-01") }, logger);
    expect(result).toEqual({ name: "test" });
    expect(logger.warn).toHaveBeenCalledWith("dropped unsupported context key", {
      key: "createdAt",
    });
  });

  it("drops arrays containing non-primitive values", () => {
    const logger = createMockLogger();
    const result = toShowwhatContext(
      { name: "test", mixed: ["a", { nested: true }] as never },
      logger,
    );
    expect(result).toEqual({ name: "test" });
    expect(logger.warn).toHaveBeenCalledWith("dropped unsupported context key", {
      key: "mixed",
    });
  });

  it("drops nested objects containing unsupported values", () => {
    const logger = createMockLogger();
    const result = toShowwhatContext(
      { name: "test", meta: { ts: new Date("2024-01-01") } as never },
      logger,
    );
    expect(result).toEqual({ name: "test" });
    expect(logger.warn).toHaveBeenCalledWith("dropped unsupported context key", {
      key: "meta",
    });
  });

  it("does not warn when no logger is provided", () => {
    const result = toShowwhatContext({ name: "test", nothing: null });
    expect(result).toEqual({ name: "test" });
  });

  it("returns empty context for empty input", () => {
    const result = toShowwhatContext({});
    expect(result).toEqual({});
  });
});

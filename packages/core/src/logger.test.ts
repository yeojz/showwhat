import { describe, it, expect, vi } from "vitest";
import { resolve } from "./resolver.js";
import type { Definitions } from "./schemas/index.js";
import type { Logger } from "./logger.js";
import { noopLogger } from "./logger.js";
import { evaluateCondition } from "./conditions/evaluate.js";
import { builtinEvaluators } from "./conditions/index.js";

function createSpyLogger(): Logger & {
  calls: { level: string; message: string; data?: Record<string, unknown> }[];
} {
  const calls: { level: string; message: string; data?: Record<string, unknown> }[] = [];
  return {
    calls,
    debug(message, data) {
      calls.push({ level: "debug", message, data });
    },
    info(message, data) {
      calls.push({ level: "info", message, data });
    },
    warn(message, data) {
      calls.push({ level: "warn", message, data });
    },
    error(message, data) {
      calls.push({ level: "error", message, data });
    },
  };
}

describe("noopLogger", () => {
  it("does not throw when called", () => {
    expect(() => noopLogger.debug("test")).not.toThrow();
    expect(() => noopLogger.info("test", { key: "value" })).not.toThrow();
    expect(() => noopLogger.warn("test")).not.toThrow();
    expect(() => noopLogger.error("test")).not.toThrow();
  });
});

describe("logger integration with resolver", () => {
  const defs: Definitions = {
    feature: {
      variations: [
        { value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] },
        { value: false },
      ],
    },
  };

  it("logs resolution steps when logger is provided", async () => {
    const logger = createSpyLogger();
    await resolve({
      definitions: defs,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators, logger },
    });

    const messages = logger.calls.map((c) => c.message);
    expect(messages).toContain("resolving definition");
    expect(messages).toContain("variation matched");
    expect(messages).toContain("resolved");
  });

  it("logs when variation does not match", async () => {
    const logger = createSpyLogger();
    await resolve({
      definitions: defs,
      context: { env: "dev" },
      options: { evaluators: builtinEvaluators, logger },
    });

    const messages = logger.calls.map((c) => c.message);
    expect(messages).toContain("variation did not match");
  });

  it("logs when definition is not found", async () => {
    const logger = createSpyLogger();
    await expect(
      resolve({
        definitions: {},
        context: { env: "prod" },
        options: { evaluators: builtinEvaluators, logger },
      }),
    ).resolves.toEqual({});
  });

  it("logs when definition is inactive", async () => {
    const logger = createSpyLogger();
    const inactiveDefs: Definitions = {
      disabled: { active: false, variations: [{ value: "x" }] },
    };

    const result = await resolve({
      definitions: inactiveDefs,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators, logger },
    });
    expect(result["disabled"].success).toBe(false);

    const warnMessages = logger.calls.filter((c) => c.level === "warn").map((c) => c.message);
    expect(warnMessages).toContain("definition inactive");
  });

  it("logs catch-all variation match (no conditions)", async () => {
    const logger = createSpyLogger();
    const catchAllDefs: Definitions = {
      flag: { variations: [{ value: "always" }] },
    };

    await resolve({
      definitions: catchAllDefs,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators, logger },
    });

    const messages = logger.calls.map((c) => c.message);
    expect(messages).toContain("variation matched (no conditions)");
  });

  it("does not log when no logger is provided", async () => {
    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    await resolve({
      definitions: defs,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators },
    });
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("logger integration with evaluateCondition", () => {
  it("logs individual condition evaluations", async () => {
    const logger = createSpyLogger();
    await evaluateCondition({
      condition: { type: "env", op: "eq", value: "prod" },
      context: { env: "prod" },
      evaluators: builtinEvaluators,
      annotations: {},
      logger,
    });

    const debugCalls = logger.calls.filter((c) => c.level === "debug");
    expect(debugCalls.some((c) => c.message === "condition evaluated")).toBe(true);
  });

  it("throws on unknown condition type", async () => {
    const logger = createSpyLogger();
    await expect(
      evaluateCondition({
        condition: { type: "nonexistent" },
        context: { env: "prod" },
        evaluators: builtinEvaluators,
        annotations: {},
        logger,
      }),
    ).rejects.toThrow('Unknown condition type "nonexistent"');
  });

  it("logs and-condition short-circuit", async () => {
    const logger = createSpyLogger();
    await evaluateCondition({
      condition: {
        type: "and",
        conditions: [
          { type: "env", op: "eq", value: "staging" },
          { type: "env", op: "eq", value: "prod" },
        ],
      },
      context: { env: "prod" },
      evaluators: builtinEvaluators,
      annotations: {},
      logger,
    });

    const messages = logger.calls.map((c) => c.message);
    expect(messages).toContain("and condition short-circuited (child returned false)");
  });

  it("logs or-condition short-circuit", async () => {
    const logger = createSpyLogger();
    await evaluateCondition({
      condition: {
        type: "or",
        conditions: [
          { type: "env", op: "eq", value: "prod" },
          { type: "env", op: "eq", value: "staging" },
        ],
      },
      context: { env: "prod" },
      evaluators: builtinEvaluators,
      annotations: {},
      logger,
    });

    const messages = logger.calls.map((c) => c.message);
    expect(messages).toContain("or condition short-circuited (child returned true)");
  });
});

describe("logger includes structured data", () => {
  it("includes key and variationIndex in resolution logs", async () => {
    const logger = createSpyLogger();
    await resolve({
      definitions: {
        myFlag: { variations: [{ value: "hello" }] },
      },
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators, logger },
    });

    const resolved = logger.calls.find((c) => c.message === "resolved");
    expect(resolved?.data).toMatchObject({
      key: "myFlag",
      variationIndex: 0,
      value: "hello",
    });
  });

  it("includes condition type and result in condition logs", async () => {
    const logger = createSpyLogger();
    await evaluateCondition({
      condition: { type: "env", op: "eq", value: "prod" },
      context: { env: "prod" },
      evaluators: builtinEvaluators,
      annotations: {},
      logger,
    });

    const evaluated = logger.calls.find((c) => c.message === "condition evaluated");
    expect(evaluated?.data).toMatchObject({ type: "env", result: true });
  });
});

import { describe, it, expect } from "vitest";
import {
  showwhat,
  registerEvaluators,
  MemoryData,
  builtinEvaluators,
  DefinitionNotFoundError,
} from "showwhat";

describe("showwhat package", () => {
  const DEFINITIONS = {
    definitions: {
      "dark-mode": {
        variations: [
          {
            value: true,
            conditions: [{ type: "string", key: "plan", op: "eq", value: "premium" }],
          },
          { value: false },
        ],
      },
    },
  };

  it("showwhat() resolves a definition end-to-end", async () => {
    const data = await MemoryData.fromObject(DEFINITIONS);

    const result = await showwhat({
      key: "dark-mode",
      context: { plan: "premium" },
      options: { data, evaluators: builtinEvaluators },
    });

    expect(result.value).toBe(true);
    expect(result.key).toBe("dark-mode");
  });

  it("showwhat() returns fallback when condition does not match", async () => {
    const data = await MemoryData.fromObject(DEFINITIONS);

    const result = await showwhat({
      key: "dark-mode",
      context: { plan: "free" },
      options: { data, evaluators: builtinEvaluators },
    });

    expect(result.value).toBe(false);
  });

  it("showwhat() throws DefinitionNotFoundError for missing key", async () => {
    const data = await MemoryData.fromObject(DEFINITIONS);

    await expect(
      showwhat({
        key: "nonexistent",
        context: { plan: "premium" },
        options: { data, evaluators: builtinEvaluators },
      }),
    ).rejects.toThrow(DefinitionNotFoundError);
  });

  it("registerEvaluators() merges custom evaluators with builtins", () => {
    const custom = async () => true;
    const merged = registerEvaluators({ myCustom: custom });

    expect(merged.string).toBeDefined();
    expect(merged.number).toBeDefined();
    expect(merged.myCustom).toBe(custom);
  });

  it("registerEvaluators() throws for reserved composite types", () => {
    expect(() => registerEvaluators({ and: async () => true })).toThrow();
    expect(() => registerEvaluators({ or: async () => true })).toThrow();
  });
});

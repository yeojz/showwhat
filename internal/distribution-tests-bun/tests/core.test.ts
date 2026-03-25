import { describe, it, expect } from "bun:test";
import * as core from "@showwhat/core";

describe("@showwhat/core main entry", () => {
  it("exports showwhat function", () => {
    expect(typeof core.showwhat).toBe("function");
  });

  it("exports resolve and resolveVariation functions", () => {
    expect(typeof core.resolve).toBe("function");
    expect(typeof core.resolveVariation).toBe("function");
  });

  it("exports MemoryData and isWritable", () => {
    expect(typeof core.MemoryData).toBe("function");
    expect(typeof core.isWritable).toBe("function");
  });

  it("exports parser functions", () => {
    expect(typeof core.parseYaml).toBe("function");
    expect(typeof core.parseObject).toBe("function");
  });

  it("exports condition functions", () => {
    expect(typeof core.evaluateCondition).toBe("function");
    expect(typeof core.builtinEvaluators).toBe("object");
    expect(typeof core.extendEvaluators).toBe("function");
    expect(typeof core.noConditionEvaluator).toBe("function");
  });

  it("exports error classes", () => {
    expect(typeof core.ShowwhatError).toBe("function");
    expect(typeof core.ParseError).toBe("function");
    expect(typeof core.ValidationError).toBe("function");
    expect(typeof core.SchemaValidationError).toBe("function");
    expect(typeof core.DefinitionNotFoundError).toBe("function");
    expect(typeof core.DefinitionInactiveError).toBe("function");
    expect(typeof core.VariationNotFoundError).toBe("function");
    expect(typeof core.InvalidContextError).toBe("function");
    expect(typeof core.DataError).toBe("function");
  });

  it("MemoryData.fromObject round-trip", async () => {
    const definitions = {
      definitions: {
        "my-flag": {
          name: "My Flag",
          variations: [
            { name: "on", value: true },
            { name: "off", value: false },
          ],
          default: "off",
        },
      },
    };

    const data = await core.MemoryData.fromObject(definitions);
    expect(data).toBeInstanceOf(core.MemoryData);
    expect(core.isWritable(data)).toBe(false);
  });
});

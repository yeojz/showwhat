import { describe, it, expect } from "vitest";
import * as core from "@showwhat/core";

describe("@showwhat/core exports", () => {
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
    expect(typeof core.noConditionEvaluator).toBe("function");
    expect(typeof core.createPresetConditions).toBe("function");
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

  it("exports Zod schemas", () => {
    expect(core.DefinitionSchema).toBeDefined();
    expect(core.DefinitionsSchema).toBeDefined();
    expect(core.VariationSchema).toBeDefined();
    expect(core.ContextSchema).toBeDefined();
    expect(core.ResolutionSchema).toBeDefined();
  });

  it("exports constants and type guards", () => {
    expect(core.CONDITION_TYPES).toBeDefined();
    expect(Object.keys(core.CONDITION_TYPES).length).toBeGreaterThan(0);
    expect(core.CONTEXT_KEYS).toBeDefined();
    expect(Object.keys(core.CONTEXT_KEYS).length).toBeGreaterThan(0);
    expect(typeof core.isAndCondition).toBe("function");
    expect(typeof core.isOrCondition).toBe("function");
  });
});

describe("@showwhat/core happy path", () => {
  const YAML_DEFINITION = `
definitions:
  dark-mode:
    variations:
      - value: true
        conditions:
          - type: string
            key: plan
            op: eq
            value: premium
      - value: false
`;

  it("parseYaml → MemoryData → resolve round-trip", async () => {
    const parsed = await core.parseYaml(YAML_DEFINITION);
    const data = await core.MemoryData.fromObject(parsed);
    const definitions = await data.getAll();

    const result = await core.resolve({
      definitions,
      context: { plan: "premium" },
      options: { evaluators: core.builtinEvaluators },
    });

    expect(result["dark-mode"]).toBeDefined();
    expect(result["dark-mode"].value).toBe(true);
  });

  it("resolve returns fallback variation when condition does not match", async () => {
    const parsed = await core.parseYaml(YAML_DEFINITION);
    const data = await core.MemoryData.fromObject(parsed);
    const definitions = await data.getAll();

    const result = await core.resolve({
      definitions,
      context: { plan: "free" },
      options: { evaluators: core.builtinEvaluators },
    });

    expect(result["dark-mode"].value).toBe(false);
  });

  it("evaluateCondition works directly", async () => {
    const match = await core.evaluateCondition({
      condition: { type: "string", key: "plan", op: "eq", value: "premium" },
      context: { plan: "premium" },
      evaluators: core.builtinEvaluators,
      annotations: {},
    });
    expect(match).toBe(true);

    const noMatch = await core.evaluateCondition({
      condition: { type: "string", key: "plan", op: "eq", value: "premium" },
      context: { plan: "free" },
      evaluators: core.builtinEvaluators,
      annotations: {},
    });
    expect(noMatch).toBe(false);
  });

  it("error classes form correct instanceof chain", () => {
    const base = new core.ShowwhatError("base");
    expect(base).toBeInstanceOf(Error);
    expect(base).toBeInstanceOf(core.ShowwhatError);

    const parse = new core.ParseError("bad yaml");
    expect(parse).toBeInstanceOf(Error);
    expect(parse).toBeInstanceOf(core.ShowwhatError);
    expect(parse).toBeInstanceOf(core.ParseError);

    const notFound = new core.DefinitionNotFoundError("missing");
    expect(notFound).toBeInstanceOf(core.ShowwhatError);
    expect(notFound.key).toBe("missing");
  });

  it("DefinitionSchema validates correctly", () => {
    const valid = core.DefinitionSchema.safeParse({
      variations: [{ value: true }],
    });
    expect(valid.success).toBe(true);

    const invalid = core.DefinitionSchema.safeParse({
      variations: [],
    });
    expect(invalid.success).toBe(false);
  });
});

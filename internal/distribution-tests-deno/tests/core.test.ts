import { assertEquals, assertInstanceOf } from "jsr:@std/assert";
import * as core from "@showwhat/core";

// ── Export existence checks ──────────────────────────────────────────────────

Deno.test("@showwhat/core — exports resolve and resolveVariation", () => {
  assertEquals(typeof core.resolve, "function");
  assertEquals(typeof core.resolveVariation, "function");
});

Deno.test("@showwhat/core — exports MemoryData and isWritable", () => {
  assertEquals(typeof core.MemoryData, "function");
  assertEquals(typeof core.isWritable, "function");
});

Deno.test("@showwhat/core — exports parser functions", () => {
  assertEquals(typeof core.parseYaml, "function");
  assertEquals(typeof core.parseObject, "function");
});

Deno.test("@showwhat/core — exports condition functions", () => {
  assertEquals(typeof core.evaluateCondition, "function");
  assertEquals(typeof core.builtinEvaluators, "object");
  assertEquals(typeof core.noConditionEvaluator, "function");
  assertEquals(typeof core.createPresetConditions, "function");
});

Deno.test("@showwhat/core — exports error classes", () => {
  assertEquals(typeof core.ShowwhatError, "function");
  assertEquals(typeof core.ParseError, "function");
  assertEquals(typeof core.ValidationError, "function");
  assertEquals(typeof core.SchemaValidationError, "function");
  assertEquals(typeof core.DefinitionNotFoundError, "function");
  assertEquals(typeof core.DefinitionInactiveError, "function");
  assertEquals(typeof core.VariationNotFoundError, "function");
  assertEquals(typeof core.InvalidContextError, "function");
  assertEquals(typeof core.DataError, "function");
});

Deno.test("@showwhat/core — exports Zod schemas", () => {
  assertEquals(core.DefinitionSchema !== undefined, true);
  assertEquals(core.DefinitionsSchema !== undefined, true);
  assertEquals(core.VariationSchema !== undefined, true);
  assertEquals(core.ContextSchema !== undefined, true);
  assertEquals(core.ResolutionSchema !== undefined, true);
});

Deno.test("@showwhat/core — exports constants and type guards", () => {
  assertEquals(core.CONDITION_TYPES !== undefined, true);
  assertEquals(Object.keys(core.CONDITION_TYPES).length > 0, true);
  assertEquals(core.CONTEXT_KEYS !== undefined, true);
  assertEquals(Object.keys(core.CONTEXT_KEYS).length > 0, true);
  assertEquals(typeof core.isAndCondition, "function");
  assertEquals(typeof core.isOrCondition, "function");
});

// ── Happy path ───────────────────────────────────────────────────────────────

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

Deno.test("@showwhat/core — parseYaml → MemoryData → resolve round-trip", async () => {
  const parsed = await core.parseYaml(YAML_DEFINITION);
  const data = await core.MemoryData.fromObject(parsed);
  const definitions = await data.getAll();

  const result = await core.resolve({
    definitions,
    context: { plan: "premium" },
    options: { evaluators: core.builtinEvaluators },
  });

  assertEquals(result["dark-mode"] !== undefined, true);
  assertEquals(result["dark-mode"].value, true);
});

Deno.test("@showwhat/core — resolve returns fallback when condition does not match", async () => {
  const parsed = await core.parseYaml(YAML_DEFINITION);
  const data = await core.MemoryData.fromObject(parsed);
  const definitions = await data.getAll();

  const result = await core.resolve({
    definitions,
    context: { plan: "free" },
    options: { evaluators: core.builtinEvaluators },
  });

  assertEquals(result["dark-mode"].value, false);
});

Deno.test("@showwhat/core — evaluateCondition works directly", async () => {
  const match = await core.evaluateCondition({
    condition: { type: "string", key: "plan", op: "eq", value: "premium" },
    context: { plan: "premium" },
    evaluators: core.builtinEvaluators,
    annotations: {},
  });
  assertEquals(match, true);

  const noMatch = await core.evaluateCondition({
    condition: { type: "string", key: "plan", op: "eq", value: "premium" },
    context: { plan: "free" },
    evaluators: core.builtinEvaluators,
    annotations: {},
  });
  assertEquals(noMatch, false);
});

Deno.test("@showwhat/core — error classes form correct instanceof chain", () => {
  const base = new core.ShowwhatError("base");
  assertInstanceOf(base, Error);
  assertInstanceOf(base, core.ShowwhatError);

  const parse = new core.ParseError("bad yaml");
  assertInstanceOf(parse, Error);
  assertInstanceOf(parse, core.ShowwhatError);
  assertInstanceOf(parse, core.ParseError);

  const notFound = new core.DefinitionNotFoundError("missing");
  assertInstanceOf(notFound, core.ShowwhatError);
  assertEquals(notFound.key, "missing");
});

Deno.test("@showwhat/core — DefinitionSchema validates correctly", () => {
  const valid = core.DefinitionSchema.safeParse({
    variations: [{ value: true }],
  });
  assertEquals(valid.success, true);

  const invalid = core.DefinitionSchema.safeParse({
    variations: [],
  });
  assertEquals(invalid.success, false);
});

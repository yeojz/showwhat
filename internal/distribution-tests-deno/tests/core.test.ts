import { assertEquals, assertInstanceOf } from "jsr:@std/assert";
import * as core from "@showwhat/core";

Deno.test("@showwhat/core — exports showwhat function", () => {
  assertEquals(typeof core.showwhat, "function");
});

Deno.test("@showwhat/core — exports resolve and resolveVariation functions", () => {
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
  assertEquals(typeof core.extendEvaluators, "function");
  assertEquals(typeof core.noConditionEvaluator, "function");
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

Deno.test("@showwhat/core — MemoryData.fromObject round-trip", async () => {
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
  assertInstanceOf(data, core.MemoryData);
  assertEquals(core.isWritable(data), false);
});

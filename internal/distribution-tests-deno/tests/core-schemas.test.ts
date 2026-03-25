import { assertEquals } from "jsr:@std/assert";
import * as schemas from "@showwhat/core/schemas";

Deno.test("@showwhat/core/schemas — exports Zod schema objects", () => {
  assertEquals(typeof schemas.DefinitionSchema, "object");
  assertEquals(typeof schemas.DefinitionsSchema, "object");
  assertEquals(typeof schemas.VariationSchema, "object");
  assertEquals(typeof schemas.ContextSchema, "object");
  assertEquals(typeof schemas.ResolutionSchema, "object");
});

Deno.test("@showwhat/core/schemas — exports CONDITION_TYPES and CONTEXT_KEYS constants", () => {
  assertEquals(typeof schemas.CONDITION_TYPES, "object");
  assertEquals(typeof schemas.CONTEXT_KEYS, "object");
  assertEquals(Object.keys(schemas.CONDITION_TYPES).length > 0, true);
  assertEquals(Object.keys(schemas.CONTEXT_KEYS).length > 0, true);
});

Deno.test("@showwhat/core/schemas — exports type guard functions", () => {
  assertEquals(typeof schemas.isAndCondition, "function");
  assertEquals(typeof schemas.isOrCondition, "function");
});

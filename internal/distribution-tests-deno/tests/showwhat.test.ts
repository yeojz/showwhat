import { assertEquals, assertRejects } from "jsr:@std/assert";
import {
  showwhat,
  registerEvaluators,
  MemoryData,
  builtinEvaluators,
  DefinitionNotFoundError,
} from "showwhat";

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

Deno.test("showwhat — resolves a definition end-to-end", async () => {
  const data = await MemoryData.fromObject(DEFINITIONS);

  const result = await showwhat({
    key: "dark-mode",
    context: { plan: "premium" },
    options: { data, evaluators: builtinEvaluators },
  });

  assertEquals(result.value, true);
  assertEquals(result.key, "dark-mode");
});

Deno.test("showwhat — returns fallback when condition does not match", async () => {
  const data = await MemoryData.fromObject(DEFINITIONS);

  const result = await showwhat({
    key: "dark-mode",
    context: { plan: "free" },
    options: { data, evaluators: builtinEvaluators },
  });

  assertEquals(result.value, false);
});

Deno.test("showwhat — throws DefinitionNotFoundError for missing key", async () => {
  const data = await MemoryData.fromObject(DEFINITIONS);

  await assertRejects(
    () =>
      showwhat({
        key: "nonexistent",
        context: { plan: "premium" },
        options: { data, evaluators: builtinEvaluators },
      }),
    DefinitionNotFoundError,
  );
});

Deno.test("showwhat — registerEvaluators merges custom with builtins", () => {
  const custom = async () => true;
  const merged = registerEvaluators({ myCustom: custom });

  assertEquals(merged.string !== undefined, true);
  assertEquals(merged.number !== undefined, true);
  assertEquals(merged.myCustom, custom);
});

Deno.test("showwhat — registerEvaluators throws for reserved composite types", () => {
  let threw = false;
  try {
    registerEvaluators({ and: async () => true });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);

  threw = false;
  try {
    registerEvaluators({ or: async () => true });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

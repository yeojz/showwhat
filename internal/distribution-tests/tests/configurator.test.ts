import { describe, it, expect } from "vitest";

describe("@showwhat/configurator", () => {
  it("resolves as a module", async () => {
    const mod = await import("@showwhat/configurator");
    expect(mod).toBeDefined();
  });

  it("exports Configurator component", async () => {
    const { Configurator } = await import("@showwhat/configurator");
    expect(typeof Configurator).toBe("function");
  });

  it("exports DefinitionEditor component", async () => {
    const { DefinitionEditor } = await import("@showwhat/configurator");
    expect(typeof DefinitionEditor).toBe("function");
  });

  it("exports DefinitionList component", async () => {
    const { DefinitionList } = await import("@showwhat/configurator");
    expect(typeof DefinitionList).toBe("function");
  });

  it("exports ConditionBuilder component", async () => {
    const { ConditionBuilder } = await import("@showwhat/configurator");
    expect(typeof ConditionBuilder).toBe("function");
  });

  it("exports useConfiguratorStore hook", async () => {
    const { useConfiguratorStore } = await import("@showwhat/configurator");
    expect(typeof useConfiguratorStore).toBe("function");
  });

  it("exports cn utility", async () => {
    const { cn } = await import("@showwhat/configurator");
    expect(typeof cn).toBe("function");
  });

  it("exports BUILTIN_CONDITION_TYPES and getConditionMeta", async () => {
    const { BUILTIN_CONDITION_TYPES, getConditionMeta } = await import("@showwhat/configurator");
    expect(Array.isArray(BUILTIN_CONDITION_TYPES)).toBe(true);
    expect(typeof getConditionMeta).toBe("function");
  });
});

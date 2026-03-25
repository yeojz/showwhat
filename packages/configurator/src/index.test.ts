import { describe, it, expect } from "vitest";
import * as exports from "./index.js";

describe("index barrel exports", () => {
  it("exports Configurator", () => {
    expect(exports.Configurator).toBeDefined();
  });

  it("exports ConditionBuilder", () => {
    expect(exports.ConditionBuilder).toBeDefined();
  });

  it("exports DefinitionEditor", () => {
    expect(exports.DefinitionEditor).toBeDefined();
  });

  it("exports DefinitionList", () => {
    expect(exports.DefinitionList).toBeDefined();
  });

  it("exports VariationCard", () => {
    expect(exports.VariationCard).toBeDefined();
  });

  it("exports VariationList", () => {
    expect(exports.VariationList).toBeDefined();
  });

  it("exports UI primitives", () => {
    expect(exports.Button).toBeDefined();
    expect(exports.Input).toBeDefined();
    expect(exports.Select).toBeDefined();
    expect(exports.Badge).toBeDefined();
    expect(exports.Separator).toBeDefined();
    expect(exports.ScrollArea).toBeDefined();
    expect(exports.Dialog).toBeDefined();
    expect(exports.DropdownMenu).toBeDefined();
    expect(exports.Label).toBeDefined();
    expect(exports.Switch).toBeDefined();
    expect(exports.Textarea).toBeDefined();
    expect(exports.Popover).toBeDefined();
    expect(exports.Tabs).toBeDefined();
  });

  it("exports common components", () => {
    expect(exports.ValueInput).toBeDefined();
    expect(exports.DateTimeInput).toBeDefined();
    expect(exports.ValidationMessage).toBeDefined();
    expect(exports.ThemeToggle).toBeDefined();
    expect(exports.ErrorBoundary).toBeDefined();
    expect(exports.ConfirmDialog).toBeDefined();
  });

  it("exports utility functions", () => {
    expect(exports.cn).toBeDefined();
    expect(exports.stripAutoIds).toBeDefined();
    expect(exports.isAutoId).toBeDefined();
    expect(exports.AUTO_ID_PREFIX).toBeDefined();
  });

  it("exports condition type metadata", () => {
    expect(exports.BUILTIN_CONDITION_TYPES).toBeDefined();
    expect(exports.CONDITION_TYPE_MAP).toBeDefined();
    expect(exports.getConditionMeta).toBeDefined();
  });

  it("exports context hooks", () => {
    expect(exports.StoreSourceContext).toBeDefined();
    expect(exports.ActionStateContext).toBeDefined();
    expect(exports.useConfiguratorStore).toBeDefined();
    expect(exports.useActionState).toBeDefined();
    expect(exports.useStoreRef).toBeDefined();
    expect(exports.useConfiguratorSelector).toBeDefined();
  });
});

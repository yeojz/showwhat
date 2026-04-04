import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Presets } from "showwhat";
import { createPresetConditionMeta, createPresetUI, createPresetEditor } from "./preset-ui.js";
import { AddConditionMenu } from "./AddConditionMenu.js";
import { ConditionValueEditor } from "./ConditionValueEditor.js";
import { ConditionBlock } from "./ConditionBlock.js";
import { ConditionExtensionsProvider } from "./ConditionExtensionsContext.js";

const SAMPLE_PRESETS: Presets = {
  tier: {
    type: "string",
    key: "tier",
  },
  age: {
    type: "number",
    key: "user_age",
  },
  admin: {
    type: "bool",
    key: "is_admin",
  },
  cutoff: {
    type: "datetime",
    key: "event_time",
  },
  segment: {
    type: "segment_match",
  },
};

const COMPOSITE_PRESETS: Presets = {
  ...SAMPLE_PRESETS,
  us_free: {
    type: "and",
    overrides: {
      conditions: [
        { type: "string", key: "region", op: "eq", value: "us" },
        { type: "string", key: "tier", op: "eq", value: "free" },
      ],
    },
  },
};

describe("createPresetConditionMeta", () => {
  it("produces correct meta entries for built-in types", () => {
    const metas = createPresetConditionMeta(SAMPLE_PRESETS);
    const tierMeta = metas.find((m) => m.type === "tier");
    expect(tierMeta).toBeDefined();
    expect(tierMeta!.label).toBe("Tier");
    expect(tierMeta!.description).toContain("tier");
    expect(tierMeta!.description).toContain("string");
  });

  it("produces correct meta entries for custom types", () => {
    const metas = createPresetConditionMeta(SAMPLE_PRESETS);
    const segmentMeta = metas.find((m) => m.type === "segment");
    expect(segmentMeta).toBeDefined();
    expect(segmentMeta!.label).toBe("Segment");
    expect(segmentMeta!.description).toContain("segment_match");
  });

  it("merges preset overrides into meta defaults", () => {
    const presetsWithOverrides: Presets = {
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
    };
    const metas = createPresetConditionMeta(presetsWithOverrides);
    const tierMeta = metas.find((m) => m.type === "tier");
    expect(tierMeta!.defaults).toMatchObject({
      type: "tier",
      key: "tier",
      op: "eq",
      value: "free",
    });
  });

  it("bakes key into defaults for built-in types", () => {
    const metas = createPresetConditionMeta(SAMPLE_PRESETS);
    const ageMeta = metas.find((m) => m.type === "age");
    expect(ageMeta!.defaults.key).toBe("user_age");
  });
});

describe("createPresetConditionMeta edge cases", () => {
  it("handles presets without overrides", () => {
    const metas = createPresetConditionMeta({
      tier: { type: "string", key: "tier" },
    });
    const tierMeta = metas.find((m) => m.type === "tier");
    expect(tierMeta!.defaults).toMatchObject({ type: "tier", key: "tier" });
  });

  it("preset overrides override type defaults", () => {
    const metas = createPresetConditionMeta({
      tier: { type: "string", key: "tier", overrides: { op: "neq", value: "enterprise" } },
    });
    const tierMeta = metas.find((m) => m.type === "tier");
    expect(tierMeta!.defaults.op).toBe("neq");
    expect(tierMeta!.defaults.value).toBe("enterprise");
  });
});

describe("createPresetUI", () => {
  it("returns editor overrides only for built-in type presets", () => {
    const { editorOverrides } = createPresetUI(SAMPLE_PRESETS);
    expect(editorOverrides.has("tier")).toBe(true);
    expect(editorOverrides.has("age")).toBe(true);
    expect(editorOverrides.has("admin")).toBe(true);
    expect(editorOverrides.has("cutoff")).toBe(true);
    expect(editorOverrides.has("segment")).toBe(false);
  });

  it("returns extra condition types for all presets", () => {
    const { extraConditionTypes } = createPresetUI(SAMPLE_PRESETS);
    expect(extraConditionTypes).toHaveLength(5);
    const types = extraConditionTypes.map((m) => m.type);
    expect(types).toContain("tier");
    expect(types).toContain("segment");
  });
});

describe("PresetConditionEditor", () => {
  it("renders string preset with disabled key", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "eq", value: "free" }}
        onChange={vi.fn()}
      />,
    );
    const keyInput = screen.getByDisplayValue("tier");
    expect(keyInput).toBeDisabled();
  });

  it("renders number preset with disabled key", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "gt", value: 18 }}
        onChange={vi.fn()}
      />,
    );
    const keyInput = screen.getByDisplayValue("user_age");
    expect(keyInput).toBeDisabled();
  });

  it("renders bool preset with disabled key", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AdminEditor = extensions.editorOverrides.get("admin")!;
    render(
      <AdminEditor
        condition={{ type: "admin", key: "is_admin", value: true }}
        onChange={vi.fn()}
      />,
    );
    const keyInput = screen.getByDisplayValue("is_admin");
    expect(keyInput).toBeDisabled();
  });

  it("renders datetime preset with disabled key", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const CutoffEditor = extensions.editorOverrides.get("cutoff")!;
    render(
      <CutoffEditor
        condition={{ type: "cutoff", key: "event_time", op: "gte", value: "2025-01-01T00:00:00Z" }}
        onChange={vi.fn()}
      />,
    );
    const keyInput = screen.getByDisplayValue("event_time");
    expect(keyInput).toBeDisabled();
  });
});

describe("PresetConditionEditor interactions", () => {
  it("string preset calls onChange with updated value", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "eq", value: "" }}
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole("textbox");
    const tagInput = inputs.find((el) => !el.hasAttribute("disabled"))!;
    await user.type(tagInput, "pro{Enter}");
    expect(onChange).toHaveBeenCalled();
  });

  it("number preset calls onChange when value changes", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "gt", value: 18 }}
        onChange={onChange}
      />,
    );
    const numInput = screen.getByDisplayValue("18");
    await user.clear(numInput);
    await user.type(numInput, "25");
    expect(onChange).toHaveBeenCalled();
  });

  it("bool preset calls onChange when value toggled", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AdminEditor = extensions.editorOverrides.get("admin")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminEditor
        condition={{ type: "admin", key: "is_admin", value: true }}
        onChange={onChange}
      />,
    );
    // The third combobox is the boolean value select (after key and op)
    const comboboxes = screen.getAllByRole("combobox");
    const valueSelect = comboboxes[comboboxes.length - 1];
    await user.click(valueSelect);
    const falseOption = screen.getByRole("option", { name: "false" });
    await user.click(falseOption);
    expect(onChange).toHaveBeenCalled();
  });

  it("datetime preset calls onChange when operator changes", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const CutoffEditor = extensions.editorOverrides.get("cutoff")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CutoffEditor
        condition={{ type: "cutoff", key: "event_time", op: "gte", value: "2025-01-01T00:00:00Z" }}
        onChange={onChange}
      />,
    );
    // There should be operator select - find comboboxes, the first non-disabled one is the op
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes[0];
    await user.click(opSelect);
    const ltOption = screen.getByRole("option", { name: "lt" });
    await user.click(ltOption);
    expect(onChange).toHaveBeenCalled();
  });

  it("string preset renders regex input when op is regex", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "regex", value: "^free" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("^free")).toBeInTheDocument();
  });

  it("string preset regex input calls onChange on typing", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "regex", value: "" }}
        onChange={onChange}
      />,
    );
    const input = screen.getByPlaceholderText("e.g. ^test.*$");
    await user.type(input, "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("string preset op select calls onChange", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "eq", value: "" }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    // The op select is the first non-disabled combobox
    await user.click(comboboxes[0]);
    const regexOpt = screen.getByRole("option", { name: "regex" });
    await user.click(regexOpt);
    expect(onChange).toHaveBeenCalled();
  });

  it("number preset op select calls onChange", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "gt", value: 18 }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    const ltOpt = screen.getByRole("option", { name: "lt" });
    await user.click(ltOpt);
    expect(onChange).toHaveBeenCalled();
  });

  it("datetime preset value change calls onChange", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const CutoffEditor = extensions.editorOverrides.get("cutoff")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CutoffEditor
        condition={{ type: "cutoff", key: "event_time", op: "gte", value: "2025-01-01T00:00:00Z" }}
        onChange={onChange}
      />,
    );
    // Switch to raw mode for easier interaction
    const rawButton = screen.getByLabelText("Switch to raw input");
    await user.click(rawButton);
    const rawInput = screen.getByPlaceholderText("ISO 8601 datetime");
    await user.clear(rawInput);
    await user.type(rawInput, "2025-06-01T00:00:00Z");
    expect(onChange).toHaveBeenCalled();
  });
});

describe("PresetConditionEditor null value fallbacks", () => {
  it("string preset in-mode renders TagInput with empty string fallback when value is null", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "in", value: null } as never}
        onChange={vi.fn()}
      />,
    );
    // TagInput should render with fallback value
    expect(screen.getByDisplayValue("tier")).toBeDisabled();
  });

  it("number preset in-mode renders NumberTagInput with empty array fallback when value is null", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "in", value: null } as never}
        onChange={vi.fn()}
      />,
    );
    // NumberTagInput should render with fallback value
    expect(screen.getByDisplayValue("user_age")).toBeDisabled();
  });

  it("number preset scalar-mode calls onChange when empty string is entered", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "gt", value: 18 }}
        onChange={onChange}
      />,
    );
    const numInput = screen.getByDisplayValue("18");
    await user.clear(numInput);
    expect(onChange).toHaveBeenCalled();
    // Clearing an input yields empty string which should emit ""
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as Record<
      string,
      unknown
    >;
    expect(lastCall.value).toBe("");
  });

  it("string preset renders plain input with null value fallback for eq op", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "eq", value: null } as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("tier")).toBeDisabled();
  });

  it("string preset renders regex input with null value fallback", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "regex", value: null } as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("e.g. ^test.*$")).toBeDefined();
  });

  it("number preset renders scalar input with undefined value showing empty", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "gt", value: undefined } as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("e.g. 100")).toBeDefined();
  });
});

describe("createPresetEditor with unknown type", () => {
  it("returns null for unrecognized built-in type", () => {
    const Editor = createPresetEditor("test", "unknown_type", "key");
    const { container } = render(<Editor condition={{ type: "test" }} onChange={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("PresetConditionEditor with missing values", () => {
  it("string preset handles missing op gracefully", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    render(<TierEditor condition={{ type: "tier", key: "tier" } as never} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("tier")).toBeDisabled();
  });

  it("number preset handles missing value gracefully", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "gt" } as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("user_age")).toBeDisabled();
  });

  it("datetime preset handles missing op and value gracefully", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const CutoffEditor = extensions.editorOverrides.get("cutoff")!;
    render(
      <CutoffEditor
        condition={{ type: "cutoff", key: "event_time" } as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("event_time")).toBeDisabled();
  });

  it("bool preset handles missing value gracefully", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AdminEditor = extensions.editorOverrides.get("admin")!;
    render(
      <AdminEditor condition={{ type: "admin", key: "is_admin" } as never} onChange={vi.fn()} />,
    );
    expect(screen.getByDisplayValue("is_admin")).toBeDisabled();
  });

  it("string preset handles missing tag value gracefully", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "eq" } as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("tier")).toBeDisabled();
  });
});

describe("String preset op coercion", () => {
  it("switching to 'in' wraps existing string value in array", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "eq", value: "pro" }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "in" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "in", value: ["pro"] }));
  });

  it("switching to 'nin' with empty value uses empty array", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "eq", value: "" }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "nin" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "nin", value: [] }));
  });

  it("switching to 'in' with existing array keeps it", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "nin", value: ["a", "b"] }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "in" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "in", value: ["a", "b"] }));
  });

  it("switching from 'in' to scalar extracts first element", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "in", value: ["alpha", "beta"] }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "eq" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "eq", value: "alpha" }));
  });

  it("switching from 'in' to scalar with empty array yields empty string", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "in", value: [] }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "eq" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "eq", value: "" }));
  });
});

describe("Number preset op coercion", () => {
  it("switching to 'in' wraps existing number value in array", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "gt", value: 42 }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "in" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "in", value: [42] }));
  });

  it("switching to 'nin' with undefined value uses empty array", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "gt" } as never}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "nin" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "nin", value: [] }));
  });

  it("switching to 'in' with empty string value uses empty array", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "gt", value: "" } as never}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "in" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "in", value: [] }));
  });

  it("switching to 'in' with existing array keeps it", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "nin", value: [1, 2, 3] }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "in" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "in", value: [1, 2, 3] }));
  });

  it("switching from 'in' to scalar extracts first element", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "in", value: [10, 20] }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "eq" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "eq", value: 10 }));
  });

  it("switching from 'in' to scalar with empty array yields 0", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "in", value: [] }}
        onChange={onChange}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "eq" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "eq", value: 0 }));
  });
});

describe("Preset TagInput/NumberTagInput onChange in array mode", () => {
  it("string preset in 'in' mode triggers onChange via TagInput", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "in", value: [] }}
        onChange={onChange}
      />,
    );
    const tagInput = screen.getByPlaceholderText("e.g. tier value");
    await user.type(tagInput, "newval{Enter}");
    expect(onChange).toHaveBeenCalled();
  });

  it("number preset in 'in' mode triggers onChange via NumberTagInput", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "in", value: [] } as never}
        onChange={onChange}
      />,
    );
    const tagInput = screen.getByPlaceholderText("e.g. user_age value");
    await user.type(tagInput, "42{Enter}");
    expect(onChange).toHaveBeenCalled();
  });

  it("string preset plain text input onChange triggers update", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "eq", value: "" }}
        onChange={onChange}
      />,
    );
    const input = screen.getByPlaceholderText("e.g. tier value");
    await user.type(input, "x");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: "tier", value: "x" }),
    );
  });
});

describe("ConditionBlock with extensions", () => {
  it("displays preset label from extensions context", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    render(
      <ConditionExtensionsProvider value={extensions}>
        <ConditionBlock
          condition={{ type: "tier", key: "tier", op: "eq", value: "free" }}
          onChange={vi.fn()}
          onRemove={vi.fn()}
        />
      </ConditionExtensionsProvider>,
    );
    expect(screen.getByText("Tier")).toBeInTheDocument();
  });
});

describe("AddConditionMenu with extensions", () => {
  it("renders preset entries when extensions provided via context", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const user = userEvent.setup();
    render(
      <ConditionExtensionsProvider value={extensions}>
        <AddConditionMenu onAdd={vi.fn()} />
      </ConditionExtensionsProvider>,
    );
    await user.click(screen.getByText("Add condition"));
    expect(screen.getByText("Tier")).toBeInTheDocument();
    expect(screen.getByText("Segment")).toBeInTheDocument();
  });

  it("calls onAdd with preset type when clicked", async () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <ConditionExtensionsProvider value={extensions}>
        <AddConditionMenu onAdd={onAdd} />
      </ConditionExtensionsProvider>,
    );
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("Tier"));
    expect(onAdd).toHaveBeenCalledWith("tier");
  });
});

describe("ConditionValueEditor with extensions", () => {
  it("uses override editor when provided via context", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    render(
      <ConditionExtensionsProvider value={extensions}>
        <ConditionValueEditor
          condition={{ type: "tier", key: "tier", op: "eq", value: "free" }}
          onChange={vi.fn()}
        />
      </ConditionExtensionsProvider>,
    );
    // Should render the preset editor (with disabled key) instead of CustomConditionEditor
    const keyInput = screen.getByDisplayValue("tier");
    expect(keyInput).toBeDisabled();
  });

  it("falls through to CustomConditionEditor for custom type presets", () => {
    const extensions = createPresetUI(SAMPLE_PRESETS);
    render(
      <ConditionExtensionsProvider value={extensions}>
        <ConditionValueEditor
          condition={{ type: "segment", region: "us", plan: "free" } as never}
          onChange={vi.fn()}
        />
      </ConditionExtensionsProvider>,
    );
    // CustomConditionEditor shows a Type input
    expect(screen.getByDisplayValue("segment")).toBeInTheDocument();
  });
});

describe("Preset overrides disable fields", () => {
  const LOCKED_PRESETS: Presets = {
    tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
    age: { type: "number", key: "user_age", overrides: { op: "gte" } },
    admin: { type: "bool", key: "is_admin", overrides: { value: true } },
    cutoff: { type: "datetime", key: "event_time", overrides: { op: "gt" } },
  };

  it("string preset disables op and value when overridden", () => {
    const extensions = createPresetUI(LOCKED_PRESETS);
    const TierEditor = extensions.editorOverrides.get("tier")!;
    render(
      <TierEditor
        condition={{ type: "tier", key: "tier", op: "eq", value: "free" }}
        onChange={vi.fn()}
      />,
    );
    // Key is always disabled
    expect(screen.getByDisplayValue("tier")).toBeDisabled();
    // Op select should be disabled
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes[0]).toBeDisabled();
    // Value input should be disabled
    const valueInput = screen.getByDisplayValue("free");
    expect(valueInput).toBeDisabled();
  });

  it("number preset disables only op when only op is overridden", () => {
    const extensions = createPresetUI(LOCKED_PRESETS);
    const AgeEditor = extensions.editorOverrides.get("age")!;
    render(
      <AgeEditor
        condition={{ type: "age", key: "user_age", op: "gte", value: 18 }}
        onChange={vi.fn()}
      />,
    );
    // Op select should be disabled
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes[0]).toBeDisabled();
    // Value input should NOT be disabled
    const valueInput = screen.getByDisplayValue("18");
    expect(valueInput).not.toBeDisabled();
  });

  it("bool preset disables value when overridden", () => {
    const extensions = createPresetUI(LOCKED_PRESETS);
    const AdminEditor = extensions.editorOverrides.get("admin")!;
    render(
      <AdminEditor
        condition={{ type: "admin", key: "is_admin", value: true }}
        onChange={vi.fn()}
      />,
    );
    // The value select should be disabled
    const comboboxes = screen.getAllByRole("combobox");
    const valueSelect = comboboxes[comboboxes.length - 1];
    expect(valueSelect).toBeDisabled();
  });

  it("datetime preset disables op when overridden but leaves value editable", () => {
    const extensions = createPresetUI(LOCKED_PRESETS);
    const CutoffEditor = extensions.editorOverrides.get("cutoff")!;
    render(
      <CutoffEditor
        condition={{ type: "cutoff", key: "event_time", op: "gt", value: "2025-01-01T00:00:00Z" }}
        onChange={vi.fn()}
      />,
    );
    // Op select should be disabled
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes[0]).toBeDisabled();
  });
});

describe("createPresetConditionMeta composite presets", () => {
  it("produces meta for composite presets", () => {
    const metas = createPresetConditionMeta(COMPOSITE_PRESETS);
    const usFree = metas.find((m) => m.type === "us_free");
    expect(usFree).toBeDefined();
    expect(usFree!.label).toBe("Us_free");
    expect(usFree!.description).toContain("and");
  });

  it("bakes overrides into composite meta defaults", () => {
    const metas = createPresetConditionMeta(COMPOSITE_PRESETS);
    const usFree = metas.find((m) => m.type === "us_free");
    expect(usFree!.defaults).toMatchObject({
      type: "us_free",
      conditions: expect.any(Array),
    });
  });
});

describe("createPresetUI composite presets", () => {
  it("returns editor overrides for composite presets", () => {
    const { editorOverrides } = createPresetUI(COMPOSITE_PRESETS);
    expect(editorOverrides.has("us_free")).toBe(true);
  });
});

describe("Composite preset editor override", () => {
  it("renders read-only label for composite preset", () => {
    const extensions = createPresetUI(COMPOSITE_PRESETS);
    const UsFreeEditor = extensions.editorOverrides.get("us_free")!;
    render(<UsFreeEditor condition={{ type: "us_free" }} onChange={vi.fn()} />);
    expect(screen.getByText(/composite/i)).toBeInTheDocument();
  });

  it("shows view button for composite preset", () => {
    const extensions = createPresetUI(COMPOSITE_PRESETS);
    const UsFreeEditor = extensions.editorOverrides.get("us_free")!;
    render(<UsFreeEditor condition={{ type: "us_free" }} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
  });
});

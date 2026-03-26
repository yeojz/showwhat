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
    defaults: { op: "eq", value: "free" },
  },
  age: {
    type: "number",
    key: "user_age",
    defaults: { op: "gt", value: 18 },
  },
  admin: {
    type: "bool",
    key: "is_admin",
    defaults: { value: true },
  },
  cutoff: {
    type: "datetime",
    key: "event_time",
    defaults: { op: "gte", value: "2025-01-01T00:00:00Z" },
  },
  segment: {
    type: "segment_match",
    defaults: { region: "us", plan: "free" },
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

  it("merges preset defaults into meta defaults", () => {
    const metas = createPresetConditionMeta(SAMPLE_PRESETS);
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
  it("handles presets without defaults", () => {
    const metas = createPresetConditionMeta({
      tier: { type: "string", key: "tier" },
    });
    const tierMeta = metas.find((m) => m.type === "tier");
    expect(tierMeta!.defaults).toMatchObject({ type: "tier", key: "tier" });
  });

  it("preset defaults override type defaults", () => {
    const metas = createPresetConditionMeta({
      tier: { type: "string", key: "tier", defaults: { op: "neq", value: "enterprise" } },
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

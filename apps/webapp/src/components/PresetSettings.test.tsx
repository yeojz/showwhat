import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock configurator UI components
vi.mock("@showwhat/configurator", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
  Textarea: ({
    value,
    onChange,
    placeholder,
    ...rest
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
    placeholder?: string;
    className?: string;
  }) => (
    <textarea
      data-testid="preset-textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...rest}
    />
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowUpCircle: () => <span data-testid="icon-arrow-up-circle" />,
  Check: () => <span data-testid="icon-check" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
}));

// Store mocks
const mockSetPresetYaml = vi.fn();
let presetStoreState: Record<string, unknown> = {};

vi.mock("../store/preset-store.js", () => {
  const usePresetStore = (selector: (s: Record<string, unknown>) => unknown) =>
    selector(presetStoreState);
  usePresetStore.getState = () => presetStoreState;
  return { usePresetStore };
});

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn: unknown) => fn,
}));

const { PresetEditor, InlinePresetList } = await import("./PresetSettings.js");

describe("PresetEditor", () => {
  beforeEach(() => {
    presetStoreState = {
      presetYaml: "tier:\n  type: string",
      presets: {},
      parseError: null,
      setPresetYaml: mockSetPresetYaml,
    };
    mockSetPresetYaml.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders heading and description", () => {
    render(<PresetEditor />);
    expect(screen.getByText("Custom Presets")).toBeDefined();
    expect(screen.getByText(/Define named condition presets/)).toBeDefined();
  });

  it("renders textarea with current presetYaml", () => {
    render(<PresetEditor />);
    const textarea = screen.getByTestId("preset-textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("tier:\n  type: string");
  });

  it("save button is disabled when draft matches presetYaml", () => {
    render(<PresetEditor />);
    const saveBtn = screen.getByText("Save") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("save button becomes enabled after editing textarea", async () => {
    const user = userEvent.setup();
    render(<PresetEditor />);
    const textarea = screen.getByTestId("preset-textarea");
    await user.click(textarea);
    await user.type(textarea, "x");
    const saveBtn = screen.getByText("Save") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
  });

  it("clicking save calls setPresetYaml and shows success on no error", async () => {
    const user = userEvent.setup();
    // After setPresetYaml is called, getState().parseError should be null
    mockSetPresetYaml.mockImplementation(() => {
      presetStoreState = { ...presetStoreState, parseError: null };
    });
    render(<PresetEditor />);
    const textarea = screen.getByTestId("preset-textarea");
    await user.type(textarea, "x");
    await user.click(screen.getByText("Save"));
    expect(mockSetPresetYaml).toHaveBeenCalled();
    expect(screen.getByText("Presets saved.")).toBeDefined();
  });

  it("clicking save shows error message when parseError is set", async () => {
    const user = userEvent.setup();
    mockSetPresetYaml.mockImplementation(() => {
      presetStoreState = { ...presetStoreState, parseError: "Invalid YAML or JSON" };
    });
    render(<PresetEditor />);
    const textarea = screen.getByTestId("preset-textarea");
    await user.type(textarea, "x");
    await user.click(screen.getByText("Save"));
    expect(screen.getByText("Invalid YAML or JSON")).toBeDefined();
  });

  it("reverts presetYaml when save encounters error", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    mockSetPresetYaml.mockImplementation((val: string) => {
      calls.push(val);
      // First call sets parseError, simulating a failed parse
      presetStoreState = { ...presetStoreState, parseError: "Bad input" };
    });
    render(<PresetEditor />);
    const textarea = screen.getByTestId("preset-textarea");
    await user.type(textarea, "x");
    await user.click(screen.getByText("Save"));
    // First call: the new draft, second call: the original presetYaml to revert
    expect(calls).toHaveLength(2);
    expect(calls[1]).toBe("tier:\n  type: string");
  });
});

describe("InlinePresetList", () => {
  afterEach(() => {
    cleanup();
  });

  const emptyPresets = {};
  const emptyDefinitionPresets: Record<string, Record<string, unknown>> = {};

  it("shows empty state when no presets from any source", () => {
    render(
      <InlinePresetList
        filePresets={emptyPresets}
        sourcePresets={emptyPresets}
        definitionPresets={emptyDefinitionPresets}
        customPresets={emptyPresets}
      />,
    );
    expect(screen.getByText("No presets loaded from source.")).toBeDefined();
    expect(screen.getByText(/Load a source that includes presets/)).toBeDefined();
  });

  it("shows presets from sourcePresets under 'Presets URL' group", () => {
    render(
      <InlinePresetList
        filePresets={emptyPresets}
        sourcePresets={{ beta: { type: "boolean" } }}
        definitionPresets={emptyDefinitionPresets}
        customPresets={emptyPresets}
      />,
    );
    expect(screen.getByText("Presets URL")).toBeDefined();
    expect(screen.getByText("beta")).toBeDefined();
    expect(screen.getByText("boolean")).toBeDefined();
  });

  it("shows presets from filePresets under 'Definition file' group", () => {
    render(
      <InlinePresetList
        filePresets={{ region: { type: "string", key: "region" } }}
        sourcePresets={emptyPresets}
        definitionPresets={emptyDefinitionPresets}
        customPresets={emptyPresets}
      />,
    );
    expect(screen.getByText("Definition file")).toBeDefined();
    expect(screen.getByText("region")).toBeDefined();
    expect(screen.getByText("string")).toBeDefined();
  });

  it("shows presets from definitionPresets under definition key group labels", () => {
    render(
      <InlinePresetList
        filePresets={emptyPresets}
        sourcePresets={emptyPresets}
        definitionPresets={{ "feature-flags": { darkMode: { type: "boolean" } } }}
        customPresets={emptyPresets}
      />,
    );
    expect(screen.getByText("feature-flags")).toBeDefined();
    expect(screen.getByText("darkMode")).toBeDefined();
    expect(screen.getByText("boolean")).toBeDefined();
  });

  it("shows amber override icon when source preset name matches a custom preset", () => {
    render(
      <InlinePresetList
        filePresets={emptyPresets}
        sourcePresets={{ tier: { type: "string" } }}
        definitionPresets={emptyDefinitionPresets}
        customPresets={{ tier: { type: "string" } }}
      />,
    );
    const icons = screen.getAllByTestId("icon-arrow-up-circle");
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows check icon when source preset does NOT match a custom preset", () => {
    render(
      <InlinePresetList
        filePresets={emptyPresets}
        sourcePresets={{ beta: { type: "boolean" } }}
        definitionPresets={emptyDefinitionPresets}
        customPresets={emptyPresets}
      />,
    );
    expect(screen.getByTestId("icon-check")).toBeDefined();
  });

  it("shows override footnote when hasOverrides is true", () => {
    render(
      <InlinePresetList
        filePresets={emptyPresets}
        sourcePresets={{ tier: { type: "string" } }}
        definitionPresets={emptyDefinitionPresets}
        customPresets={{ tier: { type: "string" } }}
      />,
    );
    expect(screen.getByText(/Amber icon indicates the source preset overrides/)).toBeDefined();
  });

  it("does not show override footnote when no overrides exist", () => {
    render(
      <InlinePresetList
        filePresets={emptyPresets}
        sourcePresets={{ beta: { type: "boolean" } }}
        definitionPresets={emptyDefinitionPresets}
        customPresets={emptyPresets}
      />,
    );
    expect(screen.queryByText(/Amber icon indicates the source preset overrides/)).toBeNull();
  });

  it("clicking a preset row with details expands to show formatted YAML", async () => {
    const user = userEvent.setup();
    render(
      <InlinePresetList
        filePresets={emptyPresets}
        sourcePresets={{
          tier: {
            type: "string",
            key: "tier",
            overrides: { op: "eq", value: "free" },
          },
        }}
        definitionPresets={emptyDefinitionPresets}
        customPresets={emptyPresets}
      />,
    );
    // Not expanded initially
    expect(screen.queryByText(/key: tier/)).toBeNull();

    // Click the row to expand
    await user.click(screen.getByText("tier"));

    // Now the formatted YAML should be visible
    const pre = screen.getByText(/key: tier/);
    expect(pre).toBeDefined();
    expect(pre.textContent).toContain("type: string");
    expect(pre.textContent).toContain("key: tier");
    expect(pre.textContent).toContain("overrides:");
    expect(pre.textContent).toContain("op: eq");
    expect(pre.textContent).toContain("value: free");
  });

  it("clicking a preset row without details does NOT expand", async () => {
    const user = userEvent.setup();
    render(
      <InlinePresetList
        filePresets={emptyPresets}
        sourcePresets={{ simple: { type: "boolean" } }}
        definitionPresets={emptyDefinitionPresets}
        customPresets={emptyPresets}
      />,
    );
    await user.click(screen.getByText("simple"));
    // No <pre> element should appear since there are no details
    const preElements = document.querySelectorAll("pre");
    expect(preElements).toHaveLength(0);
  });

  it("formatPresetYaml renders type, key, and overrides correctly via expansion", async () => {
    const user = userEvent.setup();
    render(
      <InlinePresetList
        filePresets={{
          region: {
            type: "string",
            key: "region",
            overrides: { op: "in", value: "us,eu" },
          },
        }}
        sourcePresets={emptyPresets}
        definitionPresets={emptyDefinitionPresets}
        customPresets={emptyPresets}
      />,
    );
    await user.click(screen.getByText("region"));
    const pre = screen.getByText(/key: region/);
    const lines = pre.textContent!.split("\n");
    expect(lines[0]).toBe("type: string");
    expect(lines[1]).toBe("key: region");
    expect(lines[2]).toBe("overrides:");
    expect(lines[3]).toBe("  op: in");
    expect(lines[4]).toBe("  value: us,eu");
  });
});

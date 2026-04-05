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
    expect(screen.getByText("Preset Overrides")).toBeDefined();
    expect(screen.getByText(/Define named preset overrides in YAML or JSON format/)).toBeDefined();
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

  it("shows empty state when no resolved presets", () => {
    render(<InlinePresetList resolvedPresets={emptyPresets} overrides={emptyPresets} />);
    expect(screen.getByText("No presets loaded from source.")).toBeDefined();
    expect(screen.getByText(/Load a source that includes presets/)).toBeDefined();
  });

  it("shows resolved presets under 'Resolved presets' group", () => {
    render(
      <InlinePresetList resolvedPresets={{ beta: { type: "boolean" } }} overrides={emptyPresets} />,
    );
    expect(screen.getByText("Resolved presets")).toBeDefined();
    expect(screen.getByText("beta")).toBeDefined();
    expect(screen.getByText("boolean")).toBeDefined();
  });

  it("shows amber override icon when resolved preset name matches an override", () => {
    render(
      <InlinePresetList
        resolvedPresets={{ tier: { type: "string" } }}
        overrides={{ tier: { type: "string" } }}
      />,
    );
    const icons = screen.getAllByTestId("icon-arrow-up-circle");
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows check icon when resolved preset does NOT match an override", () => {
    render(
      <InlinePresetList resolvedPresets={{ beta: { type: "boolean" } }} overrides={emptyPresets} />,
    );
    expect(screen.getByTestId("icon-check")).toBeDefined();
  });

  it("shows override footnote when hasOverrides is true", () => {
    render(
      <InlinePresetList
        resolvedPresets={{ tier: { type: "string" } }}
        overrides={{ tier: { type: "string" } }}
      />,
    );
    expect(screen.getByText(/Amber icon indicates the source preset overrides/)).toBeDefined();
  });

  it("does not show override footnote when no overrides exist", () => {
    render(
      <InlinePresetList resolvedPresets={{ beta: { type: "boolean" } }} overrides={emptyPresets} />,
    );
    expect(screen.queryByText(/Amber icon indicates the source preset overrides/)).toBeNull();
  });

  it("clicking a preset row with details expands to show formatted YAML", async () => {
    const user = userEvent.setup();
    render(
      <InlinePresetList
        resolvedPresets={{
          tier: {
            type: "string",
            key: "tier",
            overrides: { op: "eq", value: "free" },
          },
        }}
        overrides={emptyPresets}
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
        resolvedPresets={{ simple: { type: "boolean" } }}
        overrides={emptyPresets}
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
        resolvedPresets={{
          region: {
            type: "string",
            key: "region",
            overrides: { op: "in", value: "us,eu" },
          },
        }}
        overrides={emptyPresets}
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

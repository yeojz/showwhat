import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
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

  function makeReader(shared: Presets, perKey?: Record<string, Presets>) {
    return {
      getPresets: async (key?: string) => {
        if (key && perKey?.[key]) {
          return { ...shared, ...perKey[key] };
        }
        return shared;
      },
    };
  }

  it("shows empty state when no presetReader", async () => {
    render(<InlinePresetList overrides={emptyPresets} definitionKeys={[]} isSplit={false} />);
    expect(screen.getByText("No presets loaded from source.")).toBeDefined();
  });

  it("shows shared presets under 'Definition file' group for bundled mode", async () => {
    const reader = makeReader({ beta: { type: "boolean" } });
    render(
      <InlinePresetList
        presetReader={reader}
        overrides={emptyPresets}
        definitionKeys={[]}
        isSplit={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Definition file")).toBeDefined();
      expect(screen.getByText("beta")).toBeDefined();
      expect(screen.getByText("boolean")).toBeDefined();
    });
  });

  it("shows shared presets under 'Presets URL' group for split mode", async () => {
    const reader = makeReader({ env: { type: "string" } });
    render(
      <InlinePresetList
        presetReader={reader}
        overrides={emptyPresets}
        definitionKeys={["flag-a"]}
        isSplit={true}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Presets URL")).toBeDefined();
      expect(screen.getByText("env")).toBeDefined();
    });
  });

  it("shows per-key presets in separate groups for split mode", async () => {
    const reader = makeReader(
      { env: { type: "string" } },
      { "rate-limits": { rlthis: { type: "number", key: "rate" } } },
    );
    render(
      <InlinePresetList
        presetReader={reader}
        overrides={emptyPresets}
        definitionKeys={["rate-limits", "ui-config"]}
        isSplit={true}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("rate-limits")).toBeDefined();
      expect(screen.getByText("rlthis")).toBeDefined();
    });
    // rlthis should NOT appear under a ui-config group
    expect(screen.queryByText("ui-config")).toBeNull();
  });

  it("shows amber override icon when preset name matches an override", async () => {
    const reader = makeReader({ tier: { type: "string" } });
    render(
      <InlinePresetList
        presetReader={reader}
        overrides={{ tier: { type: "string" } }}
        definitionKeys={[]}
        isSplit={false}
      />,
    );
    await waitFor(() => {
      const icons = screen.getAllByTestId("icon-arrow-up-circle");
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows check icon when preset does NOT match an override", async () => {
    const reader = makeReader({ beta: { type: "boolean" } });
    render(
      <InlinePresetList
        presetReader={reader}
        overrides={emptyPresets}
        definitionKeys={[]}
        isSplit={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("icon-check")).toBeDefined();
    });
  });

  it("shows override footnote when overrides exist", async () => {
    const reader = makeReader({ tier: { type: "string" } });
    render(
      <InlinePresetList
        presetReader={reader}
        overrides={{ tier: { type: "string" } }}
        definitionKeys={[]}
        isSplit={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Amber icon indicates/)).toBeDefined();
    });
  });

  it("clicking a preset row with details expands to show formatted YAML", async () => {
    const user = userEvent.setup();
    const reader = makeReader({
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
    });
    render(
      <InlinePresetList
        presetReader={reader}
        overrides={emptyPresets}
        definitionKeys={[]}
        isSplit={false}
      />,
    );
    await waitFor(() => expect(screen.getByText("tier")).toBeDefined());
    expect(screen.queryByText(/key: tier/)).toBeNull();

    await user.click(screen.getByText("tier"));

    const pre = screen.getByText(/key: tier/);
    expect(pre.textContent).toContain("type: string");
    expect(pre.textContent).toContain("op: eq");
  });

  it("clicking a preset row without details does NOT expand", async () => {
    const user = userEvent.setup();
    const reader = makeReader({ simple: { type: "boolean" } });
    render(
      <InlinePresetList
        presetReader={reader}
        overrides={emptyPresets}
        definitionKeys={[]}
        isSplit={false}
      />,
    );
    await waitFor(() => expect(screen.getByText("simple")).toBeDefined());
    await user.click(screen.getByText("simple"));
    expect(document.querySelectorAll("pre")).toHaveLength(0);
  });
});

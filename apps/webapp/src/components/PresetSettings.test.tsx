import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { Presets } from "showwhat";

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
  Loader2: () => <span data-testid="icon-loader" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
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

  const emptyPresets: Presets = {};
  const noop = () => {};

  function renderList(props: Partial<Parameters<typeof InlinePresetList>[0]> = {}) {
    return render(
      <InlinePresetList
        sharedPresets={emptyPresets}
        loading={false}
        onRefresh={noop}
        overrides={emptyPresets}
        isSplit={false}
        loadedDefinitionKeys={[]}
        {...props}
      />,
    );
  }

  it("shows empty state when no shared presets", () => {
    renderList();
    expect(screen.getByText("No presets loaded from source.")).toBeDefined();
  });

  it("shows refresh button", () => {
    renderList();
    expect(screen.getByTestId("icon-refresh")).toBeDefined();
  });

  it("shows loader when loading", () => {
    renderList({ loading: true });
    expect(screen.getByTestId("icon-loader")).toBeDefined();
  });

  it("calls onRefresh when refresh button is clicked", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    renderList({ onRefresh });
    await user.click(screen.getByTitle("Refresh presets from source"));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("shows shared presets under 'Definition file' group for bundled mode", () => {
    renderList({
      sharedPresets: { beta: { type: "boolean" } },
    });
    expect(screen.getByText("Definition file")).toBeDefined();
    expect(screen.getByText("beta")).toBeDefined();
    expect(screen.getByText("boolean")).toBeDefined();
  });

  it("shows shared presets under 'Presets URL' group for split mode", () => {
    renderList({
      sharedPresets: { env: { type: "string" } },
      isSplit: true,
      loadedDefinitionKeys: ["flag-a"],
    });
    expect(screen.getByText("Presets URL")).toBeDefined();
    expect(screen.getByText("env")).toBeDefined();
  });

  it("shows placeholder for unloaded keys in split mode", () => {
    renderList({
      sharedPresets: { env: { type: "string" } },
      isSplit: true,
      allDefinitionKeys: ["flag-a", "flag-b", "flag-c"],
      loadedDefinitionKeys: ["flag-a"],
    });
    expect(screen.getByText("Per-definition presets")).toBeDefined();
    expect(
      screen.getByText(/Presets embedded in definition files will appear here once loaded/),
    ).toBeDefined();
    // Unloaded keys shown as badges
    expect(screen.getByText("flag-b")).toBeDefined();
    expect(screen.getByText("flag-c")).toBeDefined();
    // Loaded key should NOT appear in the unloaded list
    expect(screen.queryByText("flag-a")).toBeNull();
  });

  it("does not show placeholder when all keys are loaded in split mode", () => {
    renderList({
      sharedPresets: { env: { type: "string" } },
      isSplit: true,
      allDefinitionKeys: ["flag-a"],
      loadedDefinitionKeys: ["flag-a"],
    });
    expect(screen.queryByText("Per-definition presets")).toBeNull();
  });

  it("shows per-key file presets for loaded definitions in split mode", () => {
    renderList({
      sharedPresets: { env: { type: "string" } },
      isSplit: true,
      allDefinitionKeys: ["rate-limits", "ui-config"],
      loadedDefinitionKeys: ["rate-limits"],
      keyFilePresets: {
        "rate-limits": { rlimit: { type: "number", key: "rate" } },
      },
    });
    // Per-key presets group should appear
    expect(screen.getByText("rate-limits")).toBeDefined();
    expect(screen.getByText("rlimit")).toBeDefined();
    // Shared preset should also be present
    expect(screen.getByText("env")).toBeDefined();
    // Unloaded key shown in placeholder
    expect(screen.getByText("ui-config")).toBeDefined();
  });

  it("excludes per-key presets that duplicate shared presets", () => {
    renderList({
      sharedPresets: { env: { type: "string" } },
      isSplit: true,
      allDefinitionKeys: ["flag-a"],
      loadedDefinitionKeys: ["flag-a"],
      keyFilePresets: {
        "flag-a": { env: { type: "string" } }, // same as shared — should be excluded
      },
    });
    // No per-key group should appear since all presets duplicate shared
    expect(screen.queryByText("flag-a")).toBeNull();
  });

  it("shows amber override icon when preset name matches an override", () => {
    renderList({
      sharedPresets: { tier: { type: "string" } },
      overrides: { tier: { type: "string" } },
    });
    const icons = screen.getAllByTestId("icon-arrow-up-circle");
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows check icon when preset does NOT match an override", () => {
    renderList({
      sharedPresets: { beta: { type: "boolean" } },
    });
    expect(screen.getByTestId("icon-check")).toBeDefined();
  });

  it("shows override footnote when overrides exist", () => {
    renderList({
      sharedPresets: { tier: { type: "string" } },
      overrides: { tier: { type: "string" } },
    });
    expect(screen.getByText(/Amber icon indicates/)).toBeDefined();
  });

  it("clicking a preset row with details expands to show formatted YAML", async () => {
    const user = userEvent.setup();
    renderList({
      sharedPresets: {
        tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
      },
    });
    expect(screen.getByText("tier")).toBeDefined();
    expect(screen.queryByText(/key: tier/)).toBeNull();

    await user.click(screen.getByText("tier"));

    const pre = screen.getByText(/key: tier/);
    expect(pre.textContent).toContain("type: string");
    expect(pre.textContent).toContain("op: eq");
  });

  it("clicking a preset row without details does NOT expand", async () => {
    const user = userEvent.setup();
    renderList({
      sharedPresets: { simple: { type: "boolean" } },
    });
    expect(screen.getByText("simple")).toBeDefined();
    await user.click(screen.getByText("simple"));
    expect(document.querySelectorAll("pre")).toHaveLength(0);
  });
});

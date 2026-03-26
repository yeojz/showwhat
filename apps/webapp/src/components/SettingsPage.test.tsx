import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Stateful Tabs mock — only renders the active tab's content
const MockTabsContext = React.createContext<{ active: string; setActive: (v: string) => void }>({
  active: "",
  setActive: () => {},
});

function MockTabs({
  children,
  value,
  defaultValue,
  onValueChange,
  ...props
}: {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: string;
  className?: string;
}) {
  const [active, setActive] = React.useState(value ?? defaultValue ?? "");
  React.useEffect(() => {
    if (value !== undefined) setActive(value);
  }, [value]);
  const handleSetActive = (v: string) => {
    setActive(v);
    onValueChange?.(v);
  };
  return (
    <MockTabsContext.Provider value={{ active, setActive: handleSetActive }}>
      <div data-testid="tabs" {...props}>
        {children}
      </div>
    </MockTabsContext.Provider>
  );
}

// Mock configurator UI components
vi.mock("@showwhat/configurator", () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
  ConfirmDialog: ({
    children,
    onConfirm,
    title,
  }: {
    children: React.ReactNode;
    onConfirm: () => void;
    title: string;
    description?: string;
    actionLabel?: string;
  }) => (
    <div data-testid={`confirm-dialog-${title}`}>
      {children}
      <button data-testid="confirm-action" onClick={onConfirm}>
        Confirm
      </button>
    </div>
  ),
  Separator: ({ orientation, ...props }: { orientation?: string; className?: string }) => (
    <hr data-testid="separator" data-orientation={orientation} {...props} />
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  Tabs: MockTabs,
  TabsList: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="tabs-list" role="tablist" {...props}>
      {children}
    </div>
  ),
  TabsTrigger: ({
    children,
    value,
    ...props
  }: {
    children: React.ReactNode;
    value: string;
    className?: string;
  }) => {
    const { setActive } = React.useContext(MockTabsContext);
    return (
      <button data-testid={`tab-${value}`} role="tab" onClick={() => setActive(value)} {...props}>
        {children}
      </button>
    );
  },
  TabsContent: ({
    children,
    value,
    ...props
  }: {
    children: React.ReactNode;
    value: string;
    className?: string;
  }) => {
    const { active } = React.useContext(MockTabsContext);
    if (active !== value) return null;
    return (
      <div data-testid={`tab-content-${value}`} role="tabpanel" {...props}>
        {children}
      </div>
    );
  },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  ArrowUpCircle: () => <span data-testid="icon-override" />,
  Check: () => <span data-testid="icon-check" />,
  ChevronRight: ({ className }: { className?: string }) => (
    <span data-testid="icon-chevron-right" className={className} />
  ),
  FileText: () => <span data-testid="icon-file-text" />,
  X: () => <span data-testid="icon-x" />,
}));

// Preset store mock
const mockSetPresetYaml = vi.fn();
let presetStoreState: Record<string, unknown> = {
  presetYaml: "",
  parseError: null,
  setPresetYaml: mockSetPresetYaml,
  presets: {},
};

vi.mock("../store/preset-store.js", () => {
  const usePresetStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector(presetStoreState);
  };
  usePresetStore.getState = () => presetStoreState;
  return { usePresetStore };
});

// Store mock state
const mockClearAll = vi.fn();
let storeState: Record<string, unknown> = {};

vi.mock("../store/definition-store.js", () => {
  const useDefinitionStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector(storeState);
  };
  return { useDefinitionStore };
});

// Must re-mock zustand/react/shallow to return identity
vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn: unknown) => fn,
}));

const { SettingsPage } = await import("./SettingsPage.js");

describe("SettingsPage", () => {
  beforeEach(() => {
    storeState = {
      sourceFileName: null,
      sourceFormat: null,
      clearAll: mockClearAll,
      inlinePresets: {},
    };
    presetStoreState = {
      presetYaml: "",
      parseError: null,
      setPresetYaml: mockSetPresetYaml,
      presets: {},
    };
    mockClearAll.mockReset();
    mockSetPresetYaml.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Settings heading and back button", () => {
    render(<SettingsPage tab="sources" onTabChange={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<SettingsPage tab="sources" onTabChange={vi.fn()} onBack={onBack} />);

    // The back button contains the ArrowLeft icon
    const backButton = screen.getByTestId("icon-arrow-left").closest("button")!;
    await user.click(backButton);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows 'No source loaded.' when sourceFileName is null", () => {
    render(<SettingsPage tab="sources" onTabChange={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("No source loaded.")).toBeDefined();
  });

  it("shows source file info when sourceFileName is set", () => {
    storeState = {
      ...storeState,
      sourceFileName: "flags.yaml",
      sourceFormat: "yaml",
    };
    render(<SettingsPage tab="sources" onTabChange={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("flags.yaml")).toBeDefined();
    expect(screen.getByText("YAML")).toBeDefined();
  });

  it("calls clearAll and onBack when close source is confirmed", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    storeState = {
      ...storeState,
      sourceFileName: "flags.yaml",
      sourceFormat: "yaml",
    };
    render(<SettingsPage tab="sources" onTabChange={vi.fn()} onBack={onBack} />);

    // Click the confirm action in the ConfirmDialog
    const confirmBtn = screen.getByTestId("confirm-action");
    await user.click(confirmBtn);

    expect(mockClearAll).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("renders tab triggers for Source and Presets", () => {
    render(<SettingsPage tab="sources" onTabChange={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByTestId("tab-sources")).toBeDefined();
    expect(screen.getByTestId("tab-presets")).toBeDefined();
  });

  it("renders Custom Presets section with textarea", () => {
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Custom Presets")).toBeDefined();
    expect(screen.getByPlaceholderText(/Example/)).toBeDefined();
  });

  it("renders Save button in preset section", () => {
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Save")).toBeDefined();
  });

  it("calls setPresetYaml when Save is clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Example/);
    await user.type(textarea, "tier:");
    await user.click(screen.getByText("Save"));
    expect(mockSetPresetYaml).toHaveBeenCalled();
  });

  it("shows saved message after Save when no errors", async () => {
    const user = userEvent.setup();
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Example/);
    await user.type(textarea, "tier:");
    await user.click(screen.getByText("Save"));
    expect(screen.getByText("Presets saved.")).toBeDefined();
  });

  it("disables Save button when draft has not changed", () => {
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    const saveBtn = screen.getByText("Save");
    expect(saveBtn.hasAttribute("disabled")).toBe(true);
  });

  it("shows parse error and rolls back when Save encounters invalid input", async () => {
    mockSetPresetYaml.mockImplementation(() => {
      presetStoreState = { ...presetStoreState, parseError: "Invalid YAML" };
    });
    const user = userEvent.setup();
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Example/);
    await user.type(textarea, "bad:");
    await user.click(screen.getByText("Save"));
    expect(screen.getByText("Invalid YAML")).toBeDefined();
    expect(mockSetPresetYaml).toHaveBeenCalledTimes(2);
  });

  it("shows 'No presets from source.' when inlinePresets is empty", () => {
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("No presets from source.")).toBeDefined();
  });

  it("renders inline preset entries with name and type in collapsed state", () => {
    storeState = {
      ...storeState,
      inlinePresets: {
        tier: { type: "string", key: "tier_key" },
        region: { type: "string" },
      },
    };
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("tier")).toBeDefined();
    expect(screen.getByText("region")).toBeDefined();
    expect(screen.getAllByText("string").length).toBeGreaterThanOrEqual(2);
    // Key is not visible in collapsed state
    expect(screen.queryByText("tier_key")).toBeNull();
  });

  it("shows override icon when inline preset key overlaps with custom preset", () => {
    storeState = {
      ...storeState,
      inlinePresets: {
        tier: { type: "string", key: "tier" },
      },
    };
    presetStoreState = {
      ...presetStoreState,
      presets: {
        tier: { type: "string" },
      },
    };
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByTestId("icon-override")).toBeDefined();
  });

  it("shows check icon when no overlap with custom presets", () => {
    storeState = {
      ...storeState,
      inlinePresets: {
        tier: { type: "string" },
      },
    };
    presetStoreState = {
      ...presetStoreState,
      presets: {
        region: { type: "string" },
      },
    };
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByTestId("icon-check")).toBeDefined();
    expect(screen.queryByTestId("icon-override")).toBeNull();
  });

  it("shows inline preset key in YAML when row is expanded", async () => {
    storeState = {
      ...storeState,
      inlinePresets: {
        tier: { type: "string", key: "tier_key" },
      },
    };
    const user = userEvent.setup();
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    // Key is hidden in collapsed state
    expect(screen.queryByText(/tier_key/)).toBeNull();
    // Click the row to expand
    await user.click(screen.getByText("tier"));
    const pre = screen.getByText(/^type: string/);
    expect(pre.textContent).toContain("key: tier_key");
  });

  it("shows preformatted YAML when row is expanded", async () => {
    storeState = {
      ...storeState,
      inlinePresets: {
        tier: { type: "string", key: "tier", defaults: { op: "eq", value: "free" } },
      },
    };
    const user = userEvent.setup();
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);
    await user.click(screen.getByText("tier"));
    const pre = screen.getByText(/^type: string/);
    expect(pre.tagName).toBe("PRE");
    expect(pre.textContent).toContain("key: tier");
    expect(pre.textContent).toContain("op: eq");
    expect(pre.textContent).toContain("value: free");
  });

  it("does not show Presets tab content when Source tab is active", () => {
    render(<SettingsPage tab="sources" onTabChange={vi.fn()} onBack={vi.fn()} />);
    // Source tab is active — presets tab content should not be rendered
    expect(screen.queryByText("Custom Presets")).toBeNull();
    expect(screen.queryByText("From Source")).toBeNull();
  });

  it("calls onTabChange when a tab trigger is clicked", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<SettingsPage tab="sources" onTabChange={onTabChange} onBack={vi.fn()} />);

    await user.click(screen.getByTestId("tab-presets"));
    expect(onTabChange).toHaveBeenCalledWith("presets");
  });

  it("does not expand an inline preset row when it has no key and no defaults", async () => {
    storeState = {
      ...storeState,
      inlinePresets: {
        simple: { type: "boolean" },
      },
    };
    const user = userEvent.setup();
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);

    // The row should render but clicking should not expand it (no details)
    await user.click(screen.getByText("simple"));
    // No <pre> tag should appear since there's nothing to show
    expect(screen.queryByText(/^type: boolean/)).toBeNull();
  });

  it("formats preset YAML without key line when preset has no key", async () => {
    storeState = {
      ...storeState,
      inlinePresets: {
        nokey: { type: "string", defaults: { op: "eq", value: "test" } },
      },
    };
    const user = userEvent.setup();
    render(<SettingsPage tab="presets" onTabChange={vi.fn()} onBack={vi.fn()} />);

    // Expand the row — it has defaults so it should be expandable
    await user.click(screen.getByText("nokey"));
    const pre = screen.getByText(/^type: string/);
    expect(pre.textContent).not.toContain("key:");
    expect(pre.textContent).toContain("op: eq");
  });
});

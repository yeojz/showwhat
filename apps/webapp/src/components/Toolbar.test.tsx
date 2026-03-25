import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Presets } from "@showwhat/core";
import type { Definitions } from "@showwhat/core/schemas";

// Capture useFileImport / useFileExport return values
const mockImportFile = vi.fn();
const mockExportYaml = vi.fn();
const mockExportJson = vi.fn();
let importError: { message: string } | null = null;

vi.mock("../hooks/useFileImport.js", () => ({
  useFileImport: () => ({
    importFile: mockImportFile,
    error: importError,
  }),
}));

vi.mock("../hooks/useFileExport.js", () => ({
  useFileExport: () => ({
    exportYaml: mockExportYaml,
    exportJson: mockExportJson,
  }),
}));

// Mock configurator UI
vi.mock("@showwhat/configurator", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    title,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} title={title} {...rest}>
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
      <button data-testid="confirm-revert" onClick={onConfirm}>
        Confirm
      </button>
    </div>
  ),
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button data-testid="dropdown-item" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{children}</>
  ),
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
  ThemeToggle: ({ theme, onToggle }: { theme: string; onToggle: (t: string) => void }) => (
    <button data-testid="theme-toggle" onClick={() => onToggle("dark")}>
      {theme}
    </button>
  ),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  Download: () => <span data-testid="icon-download" />,
  Settings: () => <span data-testid="icon-settings" />,
  Undo2: () => <span data-testid="icon-undo" />,
}));

// Store mock state
const mockImportDefinitions = vi.fn();
const mockRevertAll = vi.fn();

let storeState: Record<string, unknown> = {};

vi.mock("../store/definition-store.js", () => {
  const useDefinitionStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector(storeState);
  };
  return { useDefinitionStore };
});

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn: unknown) => fn,
}));

const { Toolbar } = await import("./Toolbar.js");

const sampleDefs: Definitions = {
  "feature-a": { variations: [{ value: true }] },
};

const samplePresets: Presets = {
  tier: { type: "string", key: "tier" },
};

describe("Toolbar", () => {
  beforeEach(() => {
    storeState = {
      definitions: sampleDefs,
      savedDefinitions: sampleDefs,
      inlinePresets: {},
      sourceFileName: "flags.yaml",
      dirtyKeys: [],
      validationErrors: {},
      importDefinitions: mockImportDefinitions,
      revertAll: mockRevertAll,
    };
    importError = null;
    mockImportFile.mockReset();
    mockExportYaml.mockReset();
    mockExportJson.mockReset();
    mockImportDefinitions.mockReset();
    mockRevertAll.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderToolbar(overrides: Partial<Parameters<typeof Toolbar>[0]> = {}) {
    const ref = { current: null } as React.RefObject<HTMLInputElement | null>;
    return render(
      <Toolbar
        fileInputRef={ref}
        theme="system"
        onThemeToggle={vi.fn()}
        onOpenSettings={vi.fn()}
        {...overrides}
      />,
    );
  }

  it("renders branding text and logos", () => {
    renderToolbar();
    expect(screen.getByText("showwhat")).toBeDefined();
    const logos = screen.getAllByAltText("showwhat");
    expect(logos).toHaveLength(2);
  });

  it("shows source file name when present", () => {
    renderToolbar();
    expect(screen.getByText("flags.yaml")).toBeDefined();
  });

  it("does not show source file name when null", () => {
    storeState = { ...storeState, sourceFileName: null };
    renderToolbar();
    expect(screen.queryByText("flags.yaml")).toBeNull();
  });

  it("renders settings button that calls onOpenSettings", async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    renderToolbar({ onOpenSettings });

    const settingsBtn = screen.getByTitle("Settings");
    await user.click(settingsBtn);
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("renders theme toggle with correct theme", () => {
    renderToolbar({ theme: "dark" });
    expect(screen.getByTestId("theme-toggle").textContent).toBe("dark");
  });

  it("shows StatusBadge with 'ready' when clean and no errors", () => {
    renderToolbar();
    expect(screen.getByText("ready")).toBeDefined();
  });

  it("shows StatusBadge with 'unsaved changes' when dirty", () => {
    storeState = { ...storeState, dirtyKeys: ["feature-a"] };
    renderToolbar();
    expect(screen.getByText("unsaved changes")).toBeDefined();
  });

  it("shows StatusBadge with 'errors' when there are validation errors and dirty", () => {
    storeState = {
      ...storeState,
      dirtyKeys: ["feature-a"],
      validationErrors: { "feature-a": [{ path: [], message: "bad" }] },
    };
    renderToolbar();
    expect(screen.getByText("errors")).toBeDefined();
  });

  it("shows StatusBadge with 'errors' when there are validation errors but not dirty", () => {
    storeState = {
      ...storeState,
      dirtyKeys: [],
      validationErrors: { "feature-a": [{ path: [], message: "bad" }] },
    };
    renderToolbar();
    expect(screen.getByText("errors")).toBeDefined();
  });

  it("does not show badge or export when there are no definitions", () => {
    storeState = {
      ...storeState,
      definitions: {},
    };
    renderToolbar();
    expect(screen.queryByTestId("badge")).toBeNull();
    expect(screen.queryByText("Export")).toBeNull();
  });

  it("calls revertAll when confirm revert is triggered", async () => {
    const user = userEvent.setup();
    storeState = { ...storeState, dirtyKeys: ["feature-a"] };
    renderToolbar();

    const confirmBtn = screen.getByTestId("confirm-revert");
    await user.click(confirmBtn);
    expect(mockRevertAll).toHaveBeenCalledOnce();
  });

  it("renders export YAML and JSON buttons", () => {
    renderToolbar();
    expect(screen.getByText("Export as YAML")).toBeDefined();
    expect(screen.getByText("Export as JSON")).toBeDefined();
  });

  it("calls exportYaml when export YAML is clicked", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByText("Export as YAML"));
    expect(mockExportYaml).toHaveBeenCalledWith(sampleDefs, {}, "flags.yaml");
  });

  it("calls exportJson when export JSON is clicked", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByText("Export as JSON"));
    expect(mockExportJson).toHaveBeenCalledWith(sampleDefs, {}, "flags.json");
  });

  it("passes inline presets to export functions", async () => {
    const user = userEvent.setup();
    storeState = { ...storeState, inlinePresets: samplePresets };
    renderToolbar();

    await user.click(screen.getByText("Export as YAML"));
    expect(mockExportYaml).toHaveBeenCalledWith(sampleDefs, samplePresets, "flags.yaml");
  });

  it("derives yaml filename from json source for YAML export", async () => {
    const user = userEvent.setup();
    storeState = { ...storeState, sourceFileName: "flags.json" };
    renderToolbar();

    await user.click(screen.getByText("Export as YAML"));
    expect(mockExportYaml).toHaveBeenCalledWith(sampleDefs, {}, "flags.yaml");
  });

  it("derives json filename from yaml source for JSON export", async () => {
    const user = userEvent.setup();
    storeState = { ...storeState, sourceFileName: "flags.yml" };
    renderToolbar();

    await user.click(screen.getByText("Export as JSON"));
    expect(mockExportJson).toHaveBeenCalledWith(sampleDefs, {}, "flags.json");
  });

  it("passes undefined filename when sourceFileName is null", async () => {
    const user = userEvent.setup();
    storeState = { ...storeState, sourceFileName: null };
    renderToolbar();

    await user.click(screen.getByText("Export as YAML"));
    expect(mockExportYaml).toHaveBeenCalledWith(sampleDefs, {}, undefined);

    await user.click(screen.getByText("Export as JSON"));
    expect(mockExportJson).toHaveBeenCalledWith(sampleDefs, {}, undefined);
  });

  it("shows import error message when present", () => {
    importError = { message: "Bad file format" };
    renderToolbar();
    expect(screen.getByText("Bad file format")).toBeDefined();
  });

  it("handles file input change and calls importFile then importDefinitions", async () => {
    const defs: Definitions = { "new-flag": { variations: [{ value: "x" }] } };
    mockImportFile.mockResolvedValue({
      definitions: defs,
      presets: samplePresets,
      fileName: "imported.yaml",
      format: "yaml" as const,
    });

    const ref = { current: document.createElement("input") };
    const { container } = render(
      <Toolbar
        fileInputRef={ref}
        theme="system"
        onThemeToggle={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File(["content"], "imported.yaml", { type: "text/yaml" });

    await act(async () => {
      Object.defineProperty(fileInput, "files", { value: [file], writable: false });
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(mockImportFile).toHaveBeenCalledWith(file);
    expect(mockImportDefinitions).toHaveBeenCalledWith(
      defs,
      "imported.yaml",
      "yaml",
      samplePresets,
    );
  });

  it("does not call importDefinitions when importFile returns null", async () => {
    mockImportFile.mockResolvedValue(null);

    const ref = { current: document.createElement("input") };
    const { container } = render(
      <Toolbar
        fileInputRef={ref}
        theme="system"
        onThemeToggle={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File(["content"], "bad.yaml", { type: "text/yaml" });

    await act(async () => {
      Object.defineProperty(fileInput, "files", { value: [file], writable: false });
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(mockImportFile).toHaveBeenCalledWith(file);
    expect(mockImportDefinitions).not.toHaveBeenCalled();
  });

  it("handles file input change with no files selected", async () => {
    const ref = { current: document.createElement("input") };
    const { container } = render(
      <Toolbar
        fileInputRef={ref}
        theme="system"
        onThemeToggle={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]')!;

    await act(async () => {
      Object.defineProperty(fileInput, "files", { value: [], writable: false });
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(mockImportFile).not.toHaveBeenCalled();
  });
});

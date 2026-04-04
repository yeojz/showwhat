import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { RemoteSource } from "../store/source-store.js";

// Mock configurator UI components
vi.mock("@showwhat/configurator", () => ({
  Badge: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" {...rest}>
      {children}
    </span>
  ),
  Button: ({
    children,
    onClick,
    type,
    disabled,
    title,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: string;
    disabled?: boolean;
    title?: string;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} type={type} disabled={disabled} title={title} {...rest}>
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
      <button data-testid={`confirm-${title}`} onClick={onConfirm}>
        Confirm
      </button>
    </div>
  ),
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (v: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode; align?: string }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
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
  DropdownMenuTriggerItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Input: ({ id, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={id} aria-label={id} {...props} />
  ),
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode; id?: string; className?: string }) => (
    <>{children}</>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  Download: () => <span data-testid="icon-download" />,
  Plug: () => <span data-testid="icon-plug" />,
  FilePlus2: () => <span data-testid="icon-file-plus" />,
  FileText: () => <span data-testid="icon-file-text" />,
  Globe: () => <span data-testid="icon-globe" />,
  Info: () => <span data-testid="icon-info" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  Plus: () => <span data-testid="icon-plus" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Unplug: () => <span data-testid="icon-unplug" />,
  X: () => <span data-testid="icon-x" />,
}));

// Source fetch hook mock
const mockFetchSource = vi.fn();
const mockReloadKeyList = vi.fn();
let fetchHookState = {
  loading: false,
  error: null as null | { message: string; failedKeys?: string[] },
};

vi.mock("../hooks/useSourceFetch.js", () => ({
  useSourceFetch: () => ({
    fetchSource: mockFetchSource,
    reloadKeyList: mockReloadKeyList,
    ...fetchHookState,
  }),
}));

// File import mock
const mockImportFile = vi.fn();
vi.mock("../hooks/useFileImport.js", () => ({
  useFileImport: () => ({
    importFile: mockImportFile,
    error: null,
  }),
}));

// Store mocks
const mockImportDefinitions = vi.fn();
const mockClearAll = vi.fn();
let definitionStoreState: Record<string, unknown> = {};

vi.mock("../store/definition-store.js", () => {
  const useDefinitionStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector(definitionStoreState);
  };
  return { useDefinitionStore };
});

const mockAddSource = vi.fn();
const mockUpdateSource = vi.fn();
const mockRemoveSource = vi.fn();
const mockSetActiveSource = vi.fn();
const mockMarkFetched = vi.fn();
const mockSetDefinitionKeys = vi.fn();
const mockAddDefinitionKey = vi.fn();
const mockRemoveDefinitionKey = vi.fn();
let sourceStoreState: Record<string, unknown> = {};

vi.mock("../store/source-store.js", () => {
  const useSourceStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector(sourceStoreState);
  };
  useSourceStore.getState = () => sourceStoreState;
  return { useSourceStore };
});

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn: unknown) => fn,
}));

// Mock SourceFormDialog so it doesn't interfere
vi.mock("./SourceForm.js", () => ({
  SourceFormDialog: () => null,
}));

const { SourceSettings } = await import("./SourceSettings.js");

const sampleSingleSource: RemoteSource = {
  id: "src-1",
  mode: "single",
  label: "Production",
  format: "yaml",
  url: "https://r2.example.com/flags.yaml",
  lastFetched: Date.now() - 60_000,
};

const sampleKeyedSource: RemoteSource = {
  id: "src-2",
  mode: "keyed",
  label: "Staging",
  format: "json",
  baseUrl: "https://r2.example.com/defs/{key}.json",
  definitionKeys: ["flag-a", "flag-b"],
  listUrl: "https://r2.example.com/keys.json",
};

describe("SourceSettings", () => {
  beforeEach(() => {
    definitionStoreState = {
      sourceFileName: null,
      sourceFormat: null,
      definitions: {},
      dirtyKeys: [],
      importDefinitions: mockImportDefinitions,
      clearAll: mockClearAll,
    };
    sourceStoreState = {
      sources: [],
      activeSourceId: null,
      addSource: mockAddSource,
      updateSource: mockUpdateSource,
      removeSource: mockRemoveSource,
      setActiveSource: mockSetActiveSource,
      markFetched: mockMarkFetched,
      setDefinitionKeys: mockSetDefinitionKeys,
      addDefinitionKey: mockAddDefinitionKey,
      removeDefinitionKey: mockRemoveDefinitionKey,
    };
    fetchHookState = { loading: false, error: null };
    mockFetchSource.mockReset();
    mockReloadKeyList.mockReset();
    mockImportFile.mockReset();
    mockImportDefinitions.mockReset();
    mockClearAll.mockReset();
    mockAddSource.mockReset();
    mockUpdateSource.mockReset();
    mockRemoveSource.mockReset();
    mockSetActiveSource.mockReset();
    mockMarkFetched.mockReset();
    mockSetDefinitionKeys.mockReset();
    mockAddDefinitionKey.mockReset();
    mockRemoveDefinitionKey.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  // ─── Rendering: two-pane layout ─────────────────────────────────

  it("renders source list on the left and detail panel on the right when sources exist", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource, sampleKeyedSource],
    };
    render(<SourceSettings />);

    // Left pane shows source labels, and detail panel shows selected source label
    const allProduction = screen.getAllByText("Production");
    // At least one in the list and one in the detail panel
    expect(allProduction.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Staging")).toBeDefined();
  });

  it("shows 'Sources' heading in the left pane", () => {
    render(<SourceSettings />);
    expect(screen.getByText("Sources")).toBeDefined();
  });

  // ─── Empty state ────────────────────────────────────────────────

  it("shows 'No sources configured' when no sources exist and no file loaded", () => {
    render(<SourceSettings />);
    expect(screen.getByText(/No sources configured/)).toBeDefined();
  });

  it("shows 'No source loaded' when nothing is loaded", () => {
    render(<SourceSettings />);
    // Appears in both Active section and right pane
    expect(screen.getAllByText("No source loaded").length).toBeGreaterThanOrEqual(1);
  });

  it("shows active section with file source when file is loaded", () => {
    definitionStoreState = {
      ...definitionStoreState,
      sourceFileName: "flags.yaml",
      sourceFormat: "yaml",
    };
    render(<SourceSettings />);
    expect(screen.getAllByText("flags.yaml").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Active")).toBeDefined();
  });

  // ─── Source selection ───────────────────────────────────────────

  it("auto-selects the first source when sources exist", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource, sampleKeyedSource],
    };
    render(<SourceSettings />);
    // Detail panel should show the first source's URL
    expect(screen.getByText(/r2\.example\.com\/flags\.yaml/)).toBeDefined();
  });

  it("clicking a source in the left pane shows its details in the right pane", async () => {
    const user = userEvent.setup();
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource, sampleKeyedSource],
    };
    render(<SourceSettings />);

    // Initially the first source (Production) is selected
    expect(screen.getByText(/r2\.example\.com\/flags\.yaml/)).toBeDefined();

    // Click the second source (Staging) in the left pane
    await user.click(screen.getByText("Staging"));

    // Detail panel should now show the keyed source's base URL
    expect(screen.getByText(/r2\.example\.com\/defs/)).toBeDefined();
  });

  // ─── Source detail display ──────────────────────────────────────

  it("shows source label in the detail panel top bar", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    // The detail panel renders the label
    const allLabels = screen.getAllByText("Production");
    expect(allLabels.length).toBeGreaterThanOrEqual(2); // list + detail
  });

  it("shows mode badge in sidebar and detail panel", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    expect(screen.getAllByText("single").length).toBeGreaterThanOrEqual(2);
  });

  it("shows format badge in sidebar and detail panel", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    expect(screen.getAllByText("yaml").length).toBeGreaterThanOrEqual(2);
  });

  it("shows mode and format badges for keyed source", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleKeyedSource],
    };
    render(<SourceSettings />);
    expect(screen.getAllByText("keyed").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("json").length).toBeGreaterThanOrEqual(2);
  });

  it("shows URL for single source in detail panel", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    expect(screen.getByText(/r2\.example\.com\/flags\.yaml/)).toBeDefined();
    expect(screen.getByText("URL")).toBeDefined();
  });

  it("shows base URL and list URL for keyed source in detail panel", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleKeyedSource],
    };
    render(<SourceSettings />);
    expect(screen.getByText("Base URL")).toBeDefined();
    expect(screen.getByText("List URL")).toBeDefined();
    expect(screen.getByText(/r2\.example\.com\/defs/)).toBeDefined();
    expect(screen.getByText(/r2\.example\.com\/keys\.json/)).toBeDefined();
  });

  it("shows left pane entries with mode and format text", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource, sampleKeyedSource],
    };
    render(<SourceSettings />);
    // Left pane shows "single · yaml" and "keyed · json" under source names
    // Multiple elements may match since mode badges are also in the detail panel
    expect(screen.getAllByText(/single/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/keyed/).length).toBeGreaterThanOrEqual(1);
  });

  // ─── Loaded state ───────────────────────────────────────────────

  it("shows active source in Active section when source is loaded", () => {
    definitionStoreState = {
      ...definitionStoreState,
      sourceFileName: "Production",
      sourceFormat: "yaml",
    };
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
      activeSourceId: "src-1",
    };
    render(<SourceSettings />);
    expect(screen.getByText("Active")).toBeDefined();
    // "Production" appears in both Active section and dimmed list entry
    expect(screen.getAllByText("Production").length).toBeGreaterThanOrEqual(1);
  });

  it("does not show 'loaded' badge when source is not active", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    expect(screen.queryByText("loaded")).toBeNull();
  });

  it("shows file source in Active section when file is loaded", () => {
    definitionStoreState = {
      ...definitionStoreState,
      sourceFileName: "flags.yaml",
      sourceFormat: "yaml",
    };
    render(<SourceSettings />);
    expect(screen.getAllByText("flags.yaml").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId("icon-file-text").length).toBeGreaterThanOrEqual(1);
  });

  // ─── Basic source actions in detail panel top bar ───────────────

  it("shows Load button for an unloaded source", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    expect(screen.getByText("Load")).toBeDefined();
  });

  it("shows per-URL reload button for loaded source", () => {
    definitionStoreState = {
      ...definitionStoreState,
      sourceFileName: "Production",
      sourceFormat: "yaml",
    };
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
      activeSourceId: "src-1",
    };
    render(<SourceSettings />);
    // Reload icon is rendered next to the URL
    expect(screen.getByTitle(/reload from url/i)).toBeDefined();
  });

  it("shows Unload button for loaded source", () => {
    definitionStoreState = {
      ...definitionStoreState,
      sourceFileName: "Production",
      sourceFormat: "yaml",
    };
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
      activeSourceId: "src-1",
    };
    render(<SourceSettings />);
    expect(screen.getByText("Unload")).toBeDefined();
  });

  it("does not show Unload button for unloaded source", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    expect(screen.queryByText("Unload")).toBeNull();
  });

  it("shows Edit button in the detail panel top bar", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    expect(screen.getByText("Edit")).toBeDefined();
  });

  // ─── Add source dropdown ──────────────────────────────────────

  it("shows Add source dropdown with URL and File options", () => {
    render(<SourceSettings />);
    expect(screen.getByText("From URL")).toBeDefined();
    expect(screen.getByText("From file")).toBeDefined();
  });

  it("triggers file input when 'From file' is clicked", async () => {
    const user = userEvent.setup();
    render(<SourceSettings />);
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");
    await user.click(screen.getByText("From file"));
    expect(clickSpy).toHaveBeenCalled();
  });

  // ─── Last fetched timestamps ──────────────────────────────────

  it("shows per-URL last fetched timestamp", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    // Timestamp is shown inline next to the URL
    expect(screen.getByText(/ago|just now/)).toBeDefined();
  });

  it("shows 'just now' for very recent timestamps", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [{ ...sampleSingleSource, lastFetched: Date.now() - 5_000 }],
    };
    render(<SourceSettings />);
    expect(screen.getByText(/just now/)).toBeDefined();
  });

  // ─── Delete source via left pane ──────────────────────────────

  it("shows delete button in the source detail action bar", () => {
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    expect(screen.getByTestId("confirm-dialog-Delete source?")).toBeDefined();
  });

  it("calls removeSource when delete is confirmed from action bar", async () => {
    const user = userEvent.setup();
    sourceStoreState = {
      ...sourceStoreState,
      sources: [sampleSingleSource],
    };
    render(<SourceSettings />);
    await user.click(screen.getByTestId("confirm-Delete source?"));
    expect(mockRemoveSource).toHaveBeenCalledWith("src-1");
  });
});

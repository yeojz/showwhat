import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

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
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
  ConfirmDialog: ({
    children,
    onConfirm,
    title,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onConfirm: () => void;
    title: string;
    description?: string;
    actionLabel?: string;
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
  }) => (
    <div data-testid={`confirm-dialog-${title}`}>
      {children}
      <button data-testid={`confirm-${title}`} onClick={onConfirm}>
        Confirm
      </button>
      {open !== undefined && <span data-testid={`confirm-open-${title}`}>{String(open)}</span>}
      {onOpenChange && (
        <button data-testid={`confirm-close-${title}`} onClick={() => onOpenChange(false)}>
          Cancel
        </button>
      )}
    </div>
  ),
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
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
}));

vi.mock("lucide-react", () => ({
  Download: () => <span data-testid="icon-download" />,
  Undo2: () => <span data-testid="icon-undo" />,
}));

// File import mock
const mockImportFile = vi.fn();
const mockImportError = { current: null as null | { message: string } };
vi.mock("../hooks/useFileImport.js", () => ({
  useFileImport: () => ({
    importFile: mockImportFile,
    error: mockImportError.current,
  }),
}));

// File export mock
const mockExportYaml = vi.fn();
const mockExportJson = vi.fn();
vi.mock("../hooks/useFileExport.js", () => ({
  useFileExport: () => ({
    exportYaml: mockExportYaml,
    exportJson: mockExportJson,
  }),
}));

// Store mocks
const mockImportDefinitions = vi.fn();
const mockRevertAll = vi.fn();
let definitionStoreState: Record<string, unknown> = {};

vi.mock("../store/definition-store.js", () => {
  const useDefinitionStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector(definitionStoreState);
  };
  return { useDefinitionStore };
});

let sourceStoreState: Record<string, unknown> = {};

vi.mock("../store/source-store.js", () => {
  const useSourceStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector(sourceStoreState);
  };
  return { useSourceStore };
});

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn: unknown) => fn,
}));

const { SidebarActions } = await import("./SidebarActions.js");

describe("SidebarActions", () => {
  beforeEach(() => {
    definitionStoreState = {
      definitions: { "feature-a": { variations: [{ value: true }] } },
      savedDefinitions: { "feature-a": { variations: [{ value: true }] } },
      filePresets: {},
      sourceFileName: "flags.yaml",
      dirtyKeys: [],
      validationErrors: {},
      importDefinitions: mockImportDefinitions,
      revertAll: mockRevertAll,
    };
    sourceStoreState = {
      activeSourceId: null,
      sources: [],
      setActiveSource: vi.fn(),
    };
    mockImportFile.mockReset();
    mockExportYaml.mockReset();
    mockExportJson.mockReset();
    mockImportDefinitions.mockReset();
    mockRevertAll.mockReset();
    mockImportError.current = null;
  });

  afterEach(() => {
    cleanup();
  });

  function renderSidebarActions() {
    const ref = React.createRef<HTMLInputElement>();
    return render(<SidebarActions fileInputRef={ref} />);
  }

  it("returns null when no definitions are loaded", () => {
    definitionStoreState = { ...definitionStoreState, definitions: {} };
    const { container } = renderSidebarActions();
    expect(container.innerHTML).toBe("");
  });

  it("renders status badge with 'ready' when clean and no errors", () => {
    renderSidebarActions();
    expect(screen.getByText("ready")).toBeDefined();
  });

  it("renders status badge with 'unsaved' when dirty keys exist", () => {
    definitionStoreState = { ...definitionStoreState, dirtyKeys: ["feature-a"] };
    renderSidebarActions();
    expect(screen.getByText("unsaved")).toBeDefined();
  });

  it("renders status badge with 'errors' when validation errors exist", () => {
    definitionStoreState = {
      ...definitionStoreState,
      validationErrors: { "feature-a": ["some error"] },
    };
    renderSidebarActions();
    expect(screen.getByText("errors")).toBeDefined();
  });

  it("shows revert confirm dialog when dirty", () => {
    definitionStoreState = { ...definitionStoreState, dirtyKeys: ["feature-a"] };
    renderSidebarActions();
    expect(screen.getByTestId("confirm-dialog-Revert all changes?")).toBeDefined();
  });

  it("calls revertAll when revert is confirmed", async () => {
    const user = userEvent.setup();
    definitionStoreState = { ...definitionStoreState, dirtyKeys: ["feature-a"] };
    renderSidebarActions();
    await user.click(screen.getByTestId("confirm-Revert all changes?"));
    expect(mockRevertAll).toHaveBeenCalled();
  });

  it("renders Export dropdown when not keyed source and canExport", () => {
    renderSidebarActions();
    expect(screen.getByText("Export")).toBeDefined();
  });

  it("disables Export button when dirty", () => {
    definitionStoreState = { ...definitionStoreState, dirtyKeys: ["feature-a"] };
    renderSidebarActions();
    const exportBtn = screen.getByText("Export").closest("button")!;
    expect(exportBtn.disabled).toBe(true);
  });

  it("disables Export button when there are errors", () => {
    definitionStoreState = {
      ...definitionStoreState,
      validationErrors: { "feature-a": ["err"] },
    };
    renderSidebarActions();
    const exportBtn = screen.getByText("Export").closest("button")!;
    expect(exportBtn.disabled).toBe(true);
  });

  it("calls exportYaml when YAML export is clicked", async () => {
    const user = userEvent.setup();
    renderSidebarActions();
    await user.click(screen.getByText("Export as YAML"));
    expect(mockExportYaml).toHaveBeenCalled();
  });

  it("calls exportJson when JSON export is clicked", async () => {
    const user = userEvent.setup();
    renderSidebarActions();
    await user.click(screen.getByText("Export as JSON"));
    expect(mockExportJson).toHaveBeenCalled();
  });

  it("does not show Export when active source is keyed", () => {
    sourceStoreState = {
      ...sourceStoreState,
      activeSourceId: "src-1",
      sources: [
        {
          id: "src-1",
          mode: "keyed",
          label: "Staging",
          format: "json",
          baseUrl: "https://example.com",
          definitionKeys: [],
        },
      ],
    };
    renderSidebarActions();
    expect(screen.queryByText("Export")).toBeNull();
  });

  it("shows import error message when present", () => {
    mockImportError.current = { message: "Bad file format" };
    renderSidebarActions();
    expect(screen.getByText("Bad file format")).toBeDefined();
  });

  it("renders hidden file input with correct accept types", () => {
    renderSidebarActions();
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    expect(fileInput).toBeDefined();
    expect(fileInput.accept).toBe(".yaml,.yml,.json");
    expect(fileInput.className).toContain("hidden");
  });

  it("renders 'errors' badge with undo icon when dirty and has errors", () => {
    definitionStoreState = {
      ...definitionStoreState,
      dirtyKeys: ["feature-a"],
      validationErrors: { "feature-a": ["err"] },
    };
    renderSidebarActions();
    expect(screen.getByText("errors")).toBeDefined();
    expect(screen.getByTestId("icon-undo")).toBeDefined();
  });

  // ─── File import flow ──────────────────────────────────────────

  it("imports file directly when nothing is loaded", async () => {
    definitionStoreState = {
      ...definitionStoreState,
      sourceFileName: null,
    };
    const importResult = {
      definitions: { "new-flag": { variations: [{ value: true }] } },
      fileName: "new.yaml",
      format: "yaml" as const,
    };
    mockImportFile.mockResolvedValue(importResult);

    renderSidebarActions();
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["content"], "new.yaml", { type: "text/yaml" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(mockImportFile).toHaveBeenCalled();
    expect(mockImportDefinitions).toHaveBeenCalled();
  });

  it("shows confirm dialog when importing file while something is loaded", async () => {
    const importResult = {
      definitions: { "new-flag": { variations: [{ value: true }] } },
      fileName: "new.yaml",
      format: "yaml" as const,
    };
    mockImportFile.mockResolvedValue(importResult);

    renderSidebarActions();
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["content"], "new.yaml", { type: "text/yaml" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // The pending import dialog should have open=true
    const openIndicator = screen.getByTestId("confirm-open-Replace current source?");
    expect(openIndicator.textContent).toBe("true");
  });

  it("calls importDefinitions when confirm import is clicked", async () => {
    const importResult = {
      definitions: { "new-flag": { variations: [{ value: true }] } },
      fileName: "new.yaml",
      format: "yaml" as const,
    };
    mockImportFile.mockResolvedValue(importResult);

    renderSidebarActions();
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["content"], "new.yaml", { type: "text/yaml" });
    const user = userEvent.setup();
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Confirm the import
    await user.click(screen.getByTestId("confirm-Replace current source?"));
    expect(mockImportDefinitions).toHaveBeenCalled();
  });

  it("cancels pending import when dialog is closed", async () => {
    const importResult = {
      definitions: { "new-flag": { variations: [{ value: true }] } },
      fileName: "new.yaml",
      format: "yaml" as const,
    };
    mockImportFile.mockResolvedValue(importResult);

    renderSidebarActions();
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["content"], "new.yaml", { type: "text/yaml" });
    const user = userEvent.setup();
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Cancel the import via onOpenChange(false)
    await user.click(screen.getByTestId("confirm-close-Replace current source?"));
    const openIndicator = screen.getByTestId("confirm-open-Replace current source?");
    expect(openIndicator.textContent).toBe("false");
  });

  it("does not import when file input has no files", async () => {
    renderSidebarActions();
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [] } });
    });
    expect(mockImportFile).not.toHaveBeenCalled();
  });

  it("does not import when importFile returns null", async () => {
    mockImportFile.mockResolvedValue(null);
    renderSidebarActions();
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["content"], "new.yaml", { type: "text/yaml" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    expect(mockImportDefinitions).not.toHaveBeenCalled();
  });

  it("does nothing when confirm is clicked without pending import", async () => {
    const user = userEvent.setup();
    renderSidebarActions();
    // Click confirm without uploading a file first — handleConfirmFileImport guard
    await user.click(screen.getByTestId("confirm-Replace current source?"));
    expect(mockImportDefinitions).not.toHaveBeenCalled();
  });
});

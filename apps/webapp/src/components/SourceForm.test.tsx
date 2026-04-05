import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock configurator UI components
vi.mock("@showwhat/configurator", () => ({
  Button: ({
    children,
    onClick,
    type,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: string;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} type={type} {...rest}>
      {children}
    </button>
  ),
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (v: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog">
        {children}
        {onOpenChange && (
          <>
            <button data-testid="dialog-close" onClick={() => onOpenChange(false)}>
              Close dialog
            </button>
            <button data-testid="dialog-open" onClick={() => onOpenChange(true)}>
              Open dialog
            </button>
          </>
        )}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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
    <select
      data-testid="format-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
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
}));

vi.mock("lucide-react", () => ({
  Info: () => <span data-testid="icon-info" />,
}));

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn: unknown) => fn,
}));

const { SourceFormDialog } = await import("./SourceForm.js");

describe("SourceFormDialog", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when closed", () => {
    render(<SourceFormDialog open={false} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByTestId("dialog")).toBeNull();
  });

  it("renders form in add mode when open", () => {
    render(<SourceFormDialog open={true} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Add hosted source")).toBeDefined();
    expect(screen.getByText("Label")).toBeDefined();
    expect(screen.getByText("Bundled")).toBeDefined();
    expect(screen.getByText("Add source")).toBeDefined();
  });

  it("shows Edit title when editing", () => {
    const source = {
      id: "src-1",
      mode: "bundled" as const,
      label: "Production",
      format: "yaml" as const,
      url: "https://example.com/flags.yaml",
    };
    render(<SourceFormDialog open={true} initial={source} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Edit hosted source")).toBeDefined();
    expect(screen.getByText("Update")).toBeDefined();
  });

  it("calls onClose when dialog is dismissed via overlay", async () => {
    const onClose = vi.fn();
    render(<SourceFormDialog open={true} onSave={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByTestId("dialog-close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when dialog onOpenChange receives true", async () => {
    const onClose = vi.fn();
    render(<SourceFormDialog open={true} onSave={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByTestId("dialog-open"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    render(<SourceFormDialog open={true} onSave={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows validation error when label is empty", async () => {
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText("Add source"));
    expect(screen.getByText("Label is required")).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows validation error for empty URL in bundled mode", async () => {
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("source-label"), "Test");
    await userEvent.click(screen.getByText("Add source"));
    expect(screen.getByText("URL is required")).toBeDefined();
  });

  it("shows validation error for non-HTTPS URL", async () => {
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("source-label"), "Test");
    await userEvent.type(screen.getByLabelText("source-url"), "http://evil.com/flags.yaml");
    await userEvent.click(screen.getByText("Add source"));
    expect(screen.getByText("Must be HTTPS (or localhost for dev)")).toBeDefined();
  });

  it("submits bundled source successfully", async () => {
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("source-label"), "Production");
    await userEvent.type(screen.getByLabelText("source-url"), "https://r2.example.com/flags.yaml");
    await userEvent.click(screen.getByText("Add source"));
    expect(onSave).toHaveBeenCalledWith({
      label: "Production",
      mode: "bundled",
      format: "yaml",
      url: "https://r2.example.com/flags.yaml",
      headers: undefined,
    });
  });

  it("switches to split mode and shows split fields", async () => {
    render(<SourceFormDialog open={true} onSave={vi.fn()} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText("Split (per-definition)"));
    expect(screen.getByText("List (optional)")).toBeDefined();
    expect(screen.getByText("Base")).toBeDefined();
  });

  it("validates split mode: missing baseUrl", async () => {
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("source-label"), "Split");
    await userEvent.click(screen.getByText("Split (per-definition)"));
    await userEvent.click(screen.getByText("Add source"));
    expect(screen.getByText("Base URL is required")).toBeDefined();
  });

  it("validates split mode: non-HTTPS baseUrl", async () => {
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("source-label"), "Split");
    await userEvent.click(screen.getByText("Split (per-definition)"));
    await userEvent.type(screen.getByLabelText("source-base-url"), "http://evil.com/defs/");
    await userEvent.click(screen.getByText("Add source"));
    expect(screen.getByText("Must be HTTPS (or localhost for dev)")).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits split source successfully", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText("source-label"), "Staging");
    await user.click(screen.getByText("Split (per-definition)"));
    await user.type(screen.getByLabelText("source-base-url"), "https://r2.example.com/defs/");
    await user.type(screen.getByLabelText("source-list-url"), "https://r2.example.com/keys.json");
    await user.click(screen.getByText("Add source"));
    expect(onSave).toHaveBeenCalledWith({
      label: "Staging",
      mode: "split",
      format: "yaml",
      baseUrl: "https://r2.example.com/defs/",
      listUrl: "https://r2.example.com/keys.json",
      presetsUrl: undefined,
      definitionKeys: [],
      headers: undefined,
    });
  });

  it("allows localhost URLs", async () => {
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("source-label"), "Local");
    await userEvent.type(screen.getByLabelText("source-url"), "http://localhost:3000/flags.yaml");
    await userEvent.click(screen.getByText("Add source"));
    expect(onSave).toHaveBeenCalled();
  });

  it("populates form with initial values for editing", () => {
    const source = {
      id: "src-1",
      mode: "bundled" as const,
      label: "Production",
      format: "json" as const,
      url: "https://example.com/flags.json",
      headers: { Authorization: "Bearer token" },
    };
    render(<SourceFormDialog open={true} initial={source} onSave={vi.fn()} onClose={vi.fn()} />);
    expect((screen.getByLabelText("source-label") as HTMLInputElement).value).toBe("Production");
    expect((screen.getByLabelText("source-url") as HTMLInputElement).value).toBe(
      "https://example.com/flags.json",
    );
  });

  it("changes format via select", async () => {
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("source-label"), "JsonSource");
    await userEvent.type(screen.getByLabelText("source-url"), "https://r2.example.com/flags.json");
    await userEvent.selectOptions(screen.getByTestId("format-select"), "json");
    await userEvent.click(screen.getByText("Add source"));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ format: "json" }));
  });

  it("switches from split back to bundled mode", async () => {
    render(<SourceFormDialog open={true} onSave={vi.fn()} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText("Split (per-definition)"));
    expect(screen.getByText("List (optional)")).toBeDefined();
    await userEvent.click(screen.getByText("Bundled"));
    expect(screen.queryByText("List (optional)")).toBeNull();
    expect(screen.getByText("Source")).toBeDefined();
  });

  it("shows base URL error text in split mode", async () => {
    render(<SourceFormDialog open={true} onSave={vi.fn()} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("source-label"), "Test");
    await userEvent.click(screen.getByText("Split (per-definition)"));
    await userEvent.click(screen.getByText("Add source"));
    expect(screen.getByText("Base URL is required")).toBeDefined();
  });

  it("populates form with split source initial values", () => {
    const source = {
      id: "src-2",
      mode: "split" as const,
      label: "Staging",
      format: "json" as const,
      baseUrl: "https://example.com/defs/",
      listUrl: "https://example.com/keys.json",
      definitionKeys: ["flag-a", "flag-b"],
    };
    render(<SourceFormDialog open={true} initial={source} onSave={vi.fn()} onClose={vi.fn()} />);
    expect((screen.getByLabelText("source-label") as HTMLInputElement).value).toBe("Staging");
    expect((screen.getByLabelText("source-base-url") as HTMLInputElement).value).toBe(
      "https://example.com/defs/",
    );
    expect((screen.getByLabelText("source-list-url") as HTMLInputElement).value).toBe(
      "https://example.com/keys.json",
    );
  });

  it("shows error for completely invalid URL (unparseable)", async () => {
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("source-label"), "Invalid");
    await userEvent.type(screen.getByLabelText("source-url"), "not a url at all");
    await userEvent.click(screen.getByText("Add source"));
    expect(screen.getByText("Must be HTTPS (or localhost for dev)")).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows presetsUrl field in split mode", async () => {
    render(<SourceFormDialog open={true} onSave={vi.fn()} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText("Split (per-definition)"));
    expect(screen.getByText("Presets (optional)")).toBeDefined();
  });

  it("submits split source with presetsUrl", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText("source-label"), "WithPresets");
    await user.click(screen.getByText("Split (per-definition)"));
    await user.type(screen.getByLabelText("source-base-url"), "https://r2.example.com/defs/");
    await user.type(screen.getByLabelText("source-list-url"), "https://r2.example.com/keys.json");
    await user.type(
      screen.getByLabelText("source-presets-url"),
      "https://r2.example.com/presets.json",
    );
    const dialog = screen.getByTestId("dialog");
    const submitBtn = dialog.querySelector("button[type='submit']")!;
    await user.click(submitBtn);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://r2.example.com/defs/",
        presetsUrl: "https://r2.example.com/presets.json",
        definitionKeys: [],
      }),
    );
  });

  it("validates non-HTTPS presetsUrl", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText("source-label"), "Test");
    await user.click(screen.getByText("Split (per-definition)"));
    await user.type(screen.getByLabelText("source-base-url"), "https://r2.example.com/defs/");
    await user.type(screen.getByLabelText("source-presets-url"), "http://evil.com/presets.json");
    const dialog = screen.getByTestId("dialog");
    const submitBtn = dialog.querySelector("button[type='submit']")!;
    await user.click(submitBtn);
    expect(screen.getByText("Must be HTTPS (or localhost for dev)")).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("populates presetsUrl from split source initial values", () => {
    const source = {
      id: "src-2",
      mode: "split" as const,
      label: "Staging",
      format: "json" as const,
      baseUrl: "https://example.com/defs/",
      listUrl: "https://example.com/keys.json",
      presetsUrl: "https://example.com/presets.json",
      definitionKeys: ["flag-a"],
    };
    render(<SourceFormDialog open={true} initial={source} onSave={vi.fn()} onClose={vi.fn()} />);
    expect((screen.getByLabelText("source-presets-url") as HTMLInputElement).value).toBe(
      "https://example.com/presets.json",
    );
  });

  it("validates split mode: non-HTTPS listUrl", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText("source-label"), "Test");
    await user.click(screen.getByText("Split (per-definition)"));
    await user.type(screen.getByLabelText("source-base-url"), "https://r2.example.com/defs/");
    await user.type(screen.getByLabelText("source-list-url"), "http://evil.com/keys.json");
    await user.click(screen.getByText("Add source"));
    expect(screen.getByText("Must be HTTPS (or localhost for dev)")).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits split source without listUrl (optional)", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SourceFormDialog open={true} onSave={onSave} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText("source-label"), "NoList");
    await user.click(screen.getByText("Split (per-definition)"));
    await user.type(screen.getByLabelText("source-base-url"), "https://r2.example.com/defs/");
    await user.click(screen.getByText("Add source"));
    expect(onSave).toHaveBeenCalledWith({
      label: "NoList",
      mode: "split",
      format: "yaml",
      baseUrl: "https://r2.example.com/defs/",
      listUrl: undefined,
      presetsUrl: undefined,
      definitionKeys: [],
      headers: undefined,
    });
  });
});

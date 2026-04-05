import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { HostedSource } from "../store/source-store.js";

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
  Input: ({ id, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={id} aria-label={id} {...props} />
  ),
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  Globe: () => <span data-testid="icon-globe" />,
  Info: () => <span data-testid="icon-info" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  Plug: () => <span data-testid="icon-plug" />,
  Plus: () => <span data-testid="icon-plus" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Unplug: () => <span data-testid="icon-unplug" />,
  X: () => <span data-testid="icon-x" />,
}));

const { SourceDetailPanel, ModeBadge, FormatBadge } = await import("./SourceDetailPanel.js");

// ─── Fixtures ─────────────────────────────────────────────────────

const baseBundledSource: HostedSource = {
  id: "src-1",
  mode: "bundled",
  label: "Production",
  format: "yaml",
  url: "https://r2.example.com/flags.yaml",
};

const bundledSourceWithFetched: HostedSource = {
  ...baseBundledSource,
  lastFetched: Date.now() - 5_000,
};

const splitSource: HostedSource = {
  id: "src-2",
  mode: "split",
  label: "Staging",
  format: "json",
  baseUrl: "https://r2.example.com/defs/{key}.json",
  listUrl: "https://r2.example.com/keys.json",
  presetsUrl: "https://r2.example.com/presets.json",
  definitionKeys: ["flag-a", "flag-b"],
  keyFetchedAt: { "flag-a": Date.now() - 120_000 },
};

const splitSourceNoList: HostedSource = {
  id: "src-3",
  mode: "split",
  label: "Minimal",
  format: "yaml",
  baseUrl: "https://r2.example.com/defs/{key}.yaml",
  definitionKeys: [],
};

function defaultProps(overrides: Partial<Parameters<typeof SourceDetailPanel>[0]> = {}) {
  return {
    source: baseBundledSource as HostedSource,
    isLoaded: false,
    dirtyKeys: [] as string[],
    loading: false,
    onLoad: vi.fn(),
    onRefreshSingle: vi.fn(),
    onUnload: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onReloadKeyList: vi.fn(),
    onReloadKey: vi.fn(),
    onReloadPresets: vi.fn(),
    onAddKey: vi.fn(),
    onRemoveKey: vi.fn(),
    onUpdateHeaders: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

// ─── ModeBadge / FormatBadge ──────────────────────────────────────

describe("ModeBadge", () => {
  it("renders mode text", () => {
    render(<ModeBadge mode="split" />);
    expect(screen.getByText("split")).toBeDefined();
  });
});

describe("FormatBadge", () => {
  it("renders format text", () => {
    render(<FormatBadge format="json" />);
    expect(screen.getByText("json")).toBeDefined();
  });
});

// ─── SourceDetailPanel (bundled source) ───────────────────────────

describe("SourceDetailPanel (bundled source)", () => {
  it("shows source label in top bar", () => {
    render(<SourceDetailPanel {...defaultProps()} />);
    expect(screen.getByText("Production")).toBeDefined();
  });

  it("shows mode and format badges", () => {
    render(<SourceDetailPanel {...defaultProps()} />);
    expect(screen.getByText("bundled")).toBeDefined();
    expect(screen.getByText("yaml")).toBeDefined();
  });

  it("shows URL in endpoints section", () => {
    render(<SourceDetailPanel {...defaultProps()} />);
    expect(screen.getByText("https://r2.example.com/flags.yaml")).toBeDefined();
    expect(screen.getByText("URL")).toBeDefined();
  });

  it("shows 'loaded' badge when isLoaded=true", () => {
    render(<SourceDetailPanel {...defaultProps({ isLoaded: true })} />);
    expect(screen.getByText("loaded")).toBeDefined();
  });

  it("does not show 'loaded' badge when isLoaded=false", () => {
    render(<SourceDetailPanel {...defaultProps({ isLoaded: false })} />);
    expect(screen.queryByText("loaded")).toBeNull();
  });

  it("shows Load button when not loaded", () => {
    render(<SourceDetailPanel {...defaultProps({ isLoaded: false })} />);
    expect(screen.getByText("Load")).toBeDefined();
  });

  it("shows Unload button when loaded", () => {
    render(<SourceDetailPanel {...defaultProps({ isLoaded: true })} />);
    expect(screen.getByText("Unload")).toBeDefined();
  });

  it("does not show Load button when loaded", () => {
    render(<SourceDetailPanel {...defaultProps({ isLoaded: true })} />);
    // Load text should not appear (Unload contains "Unload", not "Load" standalone)
    // The ConfirmDialog for Load wraps a button with text "Load"
    expect(screen.queryByTestId("confirm-dialog-Load source?")).toBeNull();
  });

  it("shows Edit button", () => {
    render(<SourceDetailPanel {...defaultProps()} />);
    expect(screen.getByText("Edit")).toBeDefined();
  });

  it("shows Delete button", () => {
    render(<SourceDetailPanel {...defaultProps()} />);
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("shows reload button for bundled source URL", () => {
    render(<SourceDetailPanel {...defaultProps()} />);
    expect(screen.getByTitle("Reload from url")).toBeDefined();
  });

  it("shows last-fetched timestamp next to URL", () => {
    render(<SourceDetailPanel {...defaultProps({ source: bundledSourceWithFetched })} />);
    expect(screen.getByText("just now")).toBeDefined();
  });

  it("shows 'just now' for recent timestamps", () => {
    const source: HostedSource = {
      ...baseBundledSource,
      lastFetched: Date.now() - 10_000,
    };
    render(<SourceDetailPanel {...defaultProps({ source })} />);
    expect(screen.getByText("just now")).toBeDefined();
  });

  it("shows 'Xm ago' for minutes-old timestamps", () => {
    const source: HostedSource = {
      ...baseBundledSource,
      lastFetched: Date.now() - 5 * 60_000,
    };
    render(<SourceDetailPanel {...defaultProps({ source })} />);
    expect(screen.getByText("5m ago")).toBeDefined();
  });

  it("shows 'Xh ago' for hours-old timestamps", () => {
    const source: HostedSource = {
      ...baseBundledSource,
      lastFetched: Date.now() - 3 * 3_600_000,
    };
    render(<SourceDetailPanel {...defaultProps({ source })} />);
    expect(screen.getByText("3h ago")).toBeDefined();
  });

  it("shows 'Xd ago' for days-old timestamps", () => {
    const source: HostedSource = {
      ...baseBundledSource,
      lastFetched: Date.now() - 2 * 86_400_000,
    };
    render(<SourceDetailPanel {...defaultProps({ source })} />);
    expect(screen.getByText("2d ago")).toBeDefined();
  });
});

// ─── SourceDetailPanel (split source) ─────────────────────────────

describe("SourceDetailPanel (split source)", () => {
  it("shows Base URL", () => {
    render(<SourceDetailPanel {...defaultProps({ source: splitSource })} />);
    expect(screen.getByText("Base URL")).toBeDefined();
    expect(screen.getByText("https://r2.example.com/defs/{key}.json")).toBeDefined();
  });

  it("shows List URL when present", () => {
    render(<SourceDetailPanel {...defaultProps({ source: splitSource })} />);
    expect(screen.getByText("List URL")).toBeDefined();
    expect(screen.getByText("https://r2.example.com/keys.json")).toBeDefined();
  });

  it("shows Presets URL when present", () => {
    render(<SourceDetailPanel {...defaultProps({ source: splitSource })} />);
    expect(screen.getByText("Presets URL")).toBeDefined();
    expect(screen.getByText("https://r2.example.com/presets.json")).toBeDefined();
  });

  it("does not show List URL when absent", () => {
    render(<SourceDetailPanel {...defaultProps({ source: splitSourceNoList })} />);
    expect(screen.queryByText("List URL")).toBeNull();
  });

  it("shows definition key list", () => {
    render(<SourceDetailPanel {...defaultProps({ source: splitSource })} />);
    expect(screen.getByText("flag-a")).toBeDefined();
    expect(screen.getByText("flag-b")).toBeDefined();
  });

  it("shows key count badge", () => {
    render(<SourceDetailPanel {...defaultProps({ source: splitSource })} />);
    expect(screen.getByText("2")).toBeDefined();
  });

  it("shows reload button per key when loaded", () => {
    render(<SourceDetailPanel {...defaultProps({ source: splitSource, isLoaded: true })} />);
    expect(screen.getByTitle("Reload flag-a")).toBeDefined();
    expect(screen.getByTitle("Reload flag-b")).toBeDefined();
  });

  it("disables reload button when key is dirty", () => {
    render(
      <SourceDetailPanel
        {...defaultProps({
          source: splitSource,
          isLoaded: true,
          dirtyKeys: ["flag-a"],
        })}
      />,
    );
    const btn = screen.getByTitle("Save or discard changes first");
    expect(btn).toBeDefined();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows remove button per key", () => {
    render(<SourceDetailPanel {...defaultProps({ source: splitSource })} />);
    // Each key row has an X button; there are also X buttons from headers potentially
    // but split source has 2 definition keys, so at least 2 icon-x
    const xIcons = screen.getAllByTestId("icon-x");
    expect(xIcons.length).toBeGreaterThanOrEqual(2);
  });

  it("shows 'No keys configured' with list URL hint when keys empty and listUrl present", () => {
    const source: HostedSource = {
      id: "src-empty",
      mode: "split",
      label: "Empty",
      format: "json",
      baseUrl: "https://example.com/{key}.json",
      listUrl: "https://example.com/keys.json",
      definitionKeys: [],
    };
    render(<SourceDetailPanel {...defaultProps({ source })} />);
    expect(
      screen.getByText(/No keys configured.*Reload from list endpoint or add manually/),
    ).toBeDefined();
  });

  it("shows 'Add keys manually' when keys empty and no listUrl", () => {
    render(<SourceDetailPanel {...defaultProps({ source: splitSourceNoList })} />);
    expect(screen.getByText(/No keys configured.*Add keys manually/)).toBeDefined();
  });
});

// ─── HeadersSection ───────────────────────────────────────────────

describe("HeadersSection (via SourceDetailPanel)", () => {
  it("headers section collapsed by default when no headers", () => {
    render(<SourceDetailPanel {...defaultProps()} />);
    // The section toggle exists (Headers label) but content inputs are not shown
    expect(screen.getByText("Headers")).toBeDefined();
    expect(screen.queryByPlaceholderText("Header name")).toBeNull();
  });

  it("headers section open by default when headers exist", () => {
    const source: HostedSource = {
      ...baseBundledSource,
      headers: { Authorization: "Bearer token" },
    };
    render(<SourceDetailPanel {...defaultProps({ source })} />);
    expect(screen.getByPlaceholderText("Header name")).toBeDefined();
  });

  it("shows header entries when headers exist", () => {
    const source: HostedSource = {
      ...baseBundledSource,
      headers: { Authorization: "Bearer token" },
    };
    render(<SourceDetailPanel {...defaultProps({ source })} />);
    expect(screen.getByText("Authorization")).toBeDefined();
    expect(screen.getByText("Bearer token")).toBeDefined();
  });

  it("can add a new header via inputs and Add button", async () => {
    const user = userEvent.setup();
    const onUpdateHeaders = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ onUpdateHeaders })} />);

    // Expand headers section
    await user.click(screen.getByText("Headers"));

    const nameInput = screen.getByPlaceholderText("Header name");
    const valueInput = screen.getByPlaceholderText("Value");
    await user.type(nameInput, "X-Custom");
    await user.type(valueInput, "myvalue");

    // Click the Add button inside the headers section
    const addButtons = screen.getAllByText("Add");
    // The last "Add" button in the DOM belongs to the headers section (rendered first in the panel)
    // Actually headers section Add comes before key section. Let's click the first one.
    await user.click(addButtons[0]);

    expect(onUpdateHeaders).toHaveBeenCalledWith({ "X-Custom": "myvalue" });
  });

  it("can add a new header via Enter key", async () => {
    const user = userEvent.setup();
    const onUpdateHeaders = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ onUpdateHeaders })} />);

    await user.click(screen.getByText("Headers"));

    const nameInput = screen.getByPlaceholderText("Header name");
    const valueInput = screen.getByPlaceholderText("Value");
    await user.type(nameInput, "X-Key");
    await user.type(valueInput, "val123{Enter}");

    expect(onUpdateHeaders).toHaveBeenCalledWith({ "X-Key": "val123" });
  });

  it("can remove a header", async () => {
    const user = userEvent.setup();
    const onUpdateHeaders = vi.fn();
    const source: HostedSource = {
      ...baseBundledSource,
      headers: { Authorization: "Bearer token", "X-Extra": "foo" },
    };
    render(<SourceDetailPanel {...defaultProps({ source, onUpdateHeaders })} />);

    // Headers section is open because there are headers
    // Find the remove buttons (X icons) in the header entries
    // Each header entry has an X button
    const xButtons = screen.getAllByTestId("icon-x");
    // Click the first one to remove "Authorization"
    await user.click(xButtons[0].closest("button")!);

    expect(onUpdateHeaders).toHaveBeenCalledWith({ "X-Extra": "foo" });
  });

  it("removing last header calls onUpdateHeaders(undefined)", async () => {
    const user = userEvent.setup();
    const onUpdateHeaders = vi.fn();
    const source: HostedSource = {
      ...baseBundledSource,
      headers: { Authorization: "Bearer token" },
    };
    render(<SourceDetailPanel {...defaultProps({ source, onUpdateHeaders })} />);

    const xButtons = screen.getAllByTestId("icon-x");
    await user.click(xButtons[0].closest("button")!);

    expect(onUpdateHeaders).toHaveBeenCalledWith(undefined);
  });

  it("does not add header with empty key or value", async () => {
    const user = userEvent.setup();
    const onUpdateHeaders = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ onUpdateHeaders })} />);

    await user.click(screen.getByText("Headers"));

    // Try adding with empty key
    const valueInput = screen.getByPlaceholderText("Value");
    await user.type(valueInput, "somevalue");

    const addButtons = screen.getAllByText("Add");
    await user.click(addButtons[0]);

    expect(onUpdateHeaders).not.toHaveBeenCalled();

    // Try adding with empty value
    await user.clear(valueInput);
    const nameInput = screen.getByPlaceholderText("Header name");
    await user.type(nameInput, "SomeKey");

    await user.click(addButtons[0]);

    expect(onUpdateHeaders).not.toHaveBeenCalled();
  });

  it("shows info text about local storage", async () => {
    const user = userEvent.setup();
    render(<SourceDetailPanel {...defaultProps()} />);

    await user.click(screen.getByText("Headers"));

    expect(screen.getByText(/Headers are stored in your browser/)).toBeDefined();
  });
});

// ─── KeyListSection ───────────────────────────────────────────────

describe("KeyListSection (via SourceDetailPanel)", () => {
  it("can add a key via input and Add button", async () => {
    const user = userEvent.setup();
    const onAddKey = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ source: splitSource, onAddKey })} />);

    const keyInput = screen.getByPlaceholderText("Add definition key...");
    await user.type(keyInput, "new-key");

    // The second Add button belongs to the key list section
    const addButtons = screen.getAllByText("Add");
    await user.click(addButtons[addButtons.length - 1]);

    expect(onAddKey).toHaveBeenCalledWith("new-key");
  });

  it("can add a key via Enter key", async () => {
    const user = userEvent.setup();
    const onAddKey = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ source: splitSource, onAddKey })} />);

    const keyInput = screen.getByPlaceholderText("Add definition key...");
    await user.type(keyInput, "another-key{Enter}");

    expect(onAddKey).toHaveBeenCalledWith("another-key");
  });

  it("does not add empty key", async () => {
    const user = userEvent.setup();
    const onAddKey = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ source: splitSource, onAddKey })} />);

    const addButtons = screen.getAllByText("Add");
    await user.click(addButtons[addButtons.length - 1]);

    expect(onAddKey).not.toHaveBeenCalled();
  });
});

// ─── Callback tests ───────────────────────────────────────────────

describe("SourceDetailPanel callbacks", () => {
  it("onLoad is called when Load confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onLoad = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ isLoaded: false, onLoad })} />);

    await user.click(screen.getByTestId("confirm-Load source?"));
    expect(onLoad).toHaveBeenCalledOnce();
  });

  it("onUnload is called when Unload confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onUnload = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ isLoaded: true, onUnload })} />);

    await user.click(screen.getByTestId("confirm-Unload source?"));
    expect(onUnload).toHaveBeenCalledOnce();
  });

  it("onEdit is called when Edit button is clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ onEdit })} />);

    await user.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("onDelete is called when Delete confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ onDelete })} />);

    await user.click(screen.getByTestId("confirm-Delete source?"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("onRefreshSingle is called when reload button is clicked", async () => {
    const user = userEvent.setup();
    const onRefreshSingle = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ onRefreshSingle })} />);

    await user.click(screen.getByTitle("Reload from url"));
    expect(onRefreshSingle).toHaveBeenCalledOnce();
  });

  it("calls onReloadKey when per-key reload button is clicked", async () => {
    const user = userEvent.setup();
    const onReloadKey = vi.fn();
    render(
      <SourceDetailPanel {...defaultProps({ source: splitSource, isLoaded: true, onReloadKey })} />,
    );

    await user.click(screen.getByTitle("Reload flag-a"));
    expect(onReloadKey).toHaveBeenCalledWith("flag-a");
  });

  it("calls onRemoveKey when per-key remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemoveKey = vi.fn();
    render(<SourceDetailPanel {...defaultProps({ source: splitSource, onRemoveKey })} />);

    // Each key row has its own X button; click the first one
    // The X icons in key rows appear after the refresh icons
    const xButtons = screen.getAllByTestId("icon-x");
    // Click the X next to the first key
    await user.click(xButtons[0].closest("button")!);
    expect(onRemoveKey).toHaveBeenCalled();
  });
});

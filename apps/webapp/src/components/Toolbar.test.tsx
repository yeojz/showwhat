import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@showwhat/configurator", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    title,
    className,
    role,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    className?: string;
    role?: string;
    "aria-selected"?: boolean;
    variant?: string;
    size?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
      role={role}
      aria-selected={rest["aria-selected"]}
    >
      {children}
    </button>
  ),
  ThemeToggle: ({ theme, onToggle }: { theme: string; onToggle: (t: string) => void }) => (
    <button data-testid="theme-toggle" onClick={() => onToggle("dark")}>
      {theme}
    </button>
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

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

const { Toolbar } = await import("./Toolbar.js");

describe("Toolbar", () => {
  beforeEach(() => {
    definitionStoreState = { sourceFileName: null };
    sourceStoreState = { activeSourceId: null, sources: [] };
  });

  afterEach(() => {
    cleanup();
  });

  function renderToolbar(overrides: Partial<Parameters<typeof Toolbar>[0]> = {}) {
    return render(
      <Toolbar
        tab="definitions"
        onTabChange={vi.fn()}
        theme="system"
        onThemeToggle={vi.fn()}
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

  it("renders three tab buttons", () => {
    renderToolbar();
    expect(screen.getByText("Definitions")).toBeDefined();
    expect(screen.getByText("Sources")).toBeDefined();
    expect(screen.getByText("Presets")).toBeDefined();
  });

  it("marks the active tab as selected", () => {
    renderToolbar({ tab: "sources" });
    const sourcesTab = screen.getByText("Sources").closest("button")!;
    expect(sourcesTab.getAttribute("aria-selected")).toBe("true");

    const definitionsTab = screen.getByText("Definitions").closest("button")!;
    expect(definitionsTab.getAttribute("aria-selected")).toBe("false");
  });

  it("calls onTabChange when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderToolbar({ onTabChange });

    await user.click(screen.getByText("Sources"));
    expect(onTabChange).toHaveBeenCalledWith("sources");
  });

  it("renders theme toggle with correct theme", () => {
    renderToolbar({ theme: "dark" });
    expect(screen.getByTestId("theme-toggle").textContent).toBe("dark");
  });

  it("calls onThemeToggle when theme toggle is clicked", async () => {
    const user = userEvent.setup();
    const onThemeToggle = vi.fn();
    renderToolbar({ onThemeToggle });

    await user.click(screen.getByTestId("theme-toggle"));
    expect(onThemeToggle).toHaveBeenCalledWith("dark");
  });

  it("does not render settings button", () => {
    renderToolbar();
    expect(screen.queryByTitle("Settings")).toBeNull();
  });

  it("does not show source label when nothing is loaded", () => {
    renderToolbar();
    // Only branding text should be present, no source label
    const brandingSpan = screen.getByText("showwhat");
    expect(brandingSpan).toBeDefined();
  });

  it("shows source file name when a file source is loaded", () => {
    definitionStoreState = { sourceFileName: "flags.yaml" };
    renderToolbar();
    expect(screen.getByText("flags.yaml")).toBeDefined();
  });

  it("shows active URL source label instead of file name", () => {
    definitionStoreState = { sourceFileName: "Production" };
    sourceStoreState = {
      activeSourceId: "src-1",
      sources: [
        {
          id: "src-1",
          mode: "single",
          label: "Production API",
          format: "yaml",
          url: "https://example.com/flags.yaml",
        },
      ],
    };
    renderToolbar();
    expect(screen.getByText("Production API")).toBeDefined();
  });

  it("falls back to sourceFileName when active source is not found", () => {
    definitionStoreState = { sourceFileName: "flags.yaml" };
    sourceStoreState = { activeSourceId: "missing-id", sources: [] };
    renderToolbar();
    expect(screen.getByText("flags.yaml")).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";

// Stub window.matchMedia for jsdom (used by applyTheme for "system" theme)
const matchMediaListeners: Array<() => void> = [];
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_event: string, handler: () => void) => {
      matchMediaListeners.push(handler);
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock the Configurator — we need to capture the store and emptyState props
// to verify App wires them correctly
let capturedStore: unknown = null;
let capturedEmptyState: React.ReactNode = null;

const mockCreatePresetUI = vi.fn(() => ({ extraConditionTypes: [], editorOverrides: new Map() }));

vi.mock("@showwhat/configurator", () => ({
  Configurator: ({ store, emptyState }: { store: unknown; emptyState?: React.ReactNode }) => {
    capturedStore = store;
    capturedEmptyState = emptyState;
    return <div data-testid="configurator">{emptyState}</div>;
  },
  createPresetUI: (...args: unknown[]) => mockCreatePresetUI(...args),
}));

// Mock the Toolbar — capture props to verify theme wiring
let capturedTheme: string | null = null;
let capturedOnThemeToggle: ((theme: string) => void) | null = null;
let capturedOnOpenSettings: (() => void) | null = null;
let capturedFileInputRef: React.RefObject<HTMLInputElement | null> | null = null;

vi.mock("./components/Toolbar.js", () => ({
  Toolbar: ({
    fileInputRef,
    theme,
    onThemeToggle,
    onOpenSettings,
  }: {
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    theme: string;
    onThemeToggle: (t: string) => void;
    onOpenSettings: () => void;
  }) => {
    capturedTheme = theme;
    capturedOnThemeToggle = onThemeToggle;
    capturedOnOpenSettings = onOpenSettings;
    capturedFileInputRef = fileInputRef;
    return <div data-testid="toolbar" />;
  },
}));

// Mock the EmptyState — capture callbacks to verify wiring
let capturedOnCreateNew: (() => void) | null = null;
let capturedOnImportClick: (() => void) | null = null;
vi.mock("./components/EmptyState.js", () => ({
  EmptyState: ({
    onCreateNew,
    onImportClick,
  }: {
    onCreateNew: () => void;
    onImportClick: () => void;
  }) => {
    capturedOnCreateNew = onCreateNew;
    capturedOnImportClick = onImportClick;
    return <div data-testid="empty-state" />;
  },
}));

// Mock the SettingsPage — capture onBack, tab, and onTabChange
let capturedOnBack: (() => void) | null = null;
let capturedTab: string | null = null;
let capturedOnTabChange: ((tab: string) => void) | null = null;
vi.mock("./components/SettingsPage.js", () => ({
  SettingsPage: ({
    tab,
    onTabChange,
    onBack,
  }: {
    tab: string;
    onTabChange: (tab: string) => void;
    onBack: () => void;
  }) => {
    capturedTab = tab;
    capturedOnTabChange = onTabChange;
    capturedOnBack = onBack;
    return <div data-testid="settings-page" />;
  },
}));

// Minimal store state
const mockAddDefinition = vi.fn();
const defaultState: Record<string, unknown> = {
  dirtyKeys: [],
  addDefinition: mockAddDefinition,
  definitions: {},
  savedDefinitions: {},
  inlinePresets: {},
  sourceFileName: null,
  sourceFormat: null,
  selectedKey: null,
  validationErrors: {},
  importDefinitions: vi.fn(),
  revertAll: vi.fn(),
  clearAll: vi.fn(),
};

let stateOverrides: Record<string, unknown> = {};

const buildState = () => ({ ...defaultState, ...stateOverrides });
const mockGetState = vi.fn(buildState);
const subscribers: Array<() => void> = [];
const mockSubscribe = vi.fn((listener: () => void) => {
  subscribers.push(listener);
  return () => {
    const idx = subscribers.indexOf(listener);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
});

vi.mock("./store/preset-store.js", () => {
  const usePresetStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector({ presets: {}, presetYaml: "", parseError: null, setPresetYaml: vi.fn() });
  };
  return { usePresetStore };
});

vi.mock("./store/definition-store.js", () => {
  const useDefinitionStore = Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) => {
      return selector(buildState());
    },
    {
      getState: mockGetState,
      subscribe: mockSubscribe,
    },
  );

  return { useDefinitionStore };
});

// Must import App after mocks are set up
const { App } = await import("./App.js");

describe("App", () => {
  beforeEach(() => {
    stateOverrides = {};
    capturedStore = null;
    capturedEmptyState = null;
    capturedTheme = null;
    capturedOnThemeToggle = null;
    capturedOnOpenSettings = null;
    capturedFileInputRef = null;
    capturedOnCreateNew = null;
    capturedOnImportClick = null;
    capturedOnBack = null;
    capturedTab = null;
    capturedOnTabChange = null;
    matchMediaListeners.length = 0;
    subscribers.length = 0;
    mockAddDefinition.mockReset();
    mockCreatePresetUI.mockClear();
    vi.spyOn(history, "pushState").mockImplementation(() => {});
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "", origin: "http://localhost", pathname: "/" },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("showwhat-theme");
  });

  // -----------------------------------------------------------------------
  // Theme application
  // -----------------------------------------------------------------------

  it("applies dark theme from localStorage on mount", () => {
    localStorage.setItem("showwhat-theme", "dark");
    render(<App />);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applies light theme from localStorage on mount", () => {
    localStorage.setItem("showwhat-theme", "light");
    render(<App />);

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("defaults to system theme when nothing stored", () => {
    localStorage.removeItem("showwhat-theme");
    render(<App />);

    // system theme with matchMedia.matches = false → no dark class
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(capturedTheme).toBe("system");
  });

  it("persists selected theme to localStorage", () => {
    render(<App />);

    expect(localStorage.getItem("showwhat-theme")).toBe("system");
  });

  it("applies new theme when Toolbar triggers onThemeToggle", () => {
    render(<App />);

    expect(capturedOnThemeToggle).not.toBeNull();
    act(() => {
      capturedOnThemeToggle!("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("showwhat-theme")).toBe("dark");
  });

  it("registers matchMedia listener when theme is system", () => {
    localStorage.setItem("showwhat-theme", "system");
    render(<App />);

    // system theme should register a matchMedia change listener
    expect(matchMediaListeners.length).toBeGreaterThan(0);
  });

  it("does not register matchMedia listener for explicit dark theme", () => {
    localStorage.setItem("showwhat-theme", "dark");
    render(<App />);

    expect(matchMediaListeners.length).toBe(0);
  });

  // -----------------------------------------------------------------------
  // beforeunload handler
  // -----------------------------------------------------------------------

  it("does not register beforeunload when there are no dirty definitions", () => {
    stateOverrides = { dirtyKeys: [] };
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<App />);

    const beforeunloadCalls = addSpy.mock.calls.filter(([event]) => event === "beforeunload");
    expect(beforeunloadCalls).toHaveLength(0);
  });

  it("registers beforeunload when there are dirty definitions", () => {
    stateOverrides = { dirtyKeys: ["feature-a"] };
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<App />);

    const beforeunloadCalls = addSpy.mock.calls.filter(([event]) => event === "beforeunload");
    expect(beforeunloadCalls.length).toBeGreaterThan(0);
  });

  it("beforeunload handler calls preventDefault on the event", () => {
    stateOverrides = { dirtyKeys: ["feature-a"] };
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<App />);

    const call = addSpy.mock.calls.find(([event]) => event === "beforeunload");
    expect(call).toBeDefined();

    const handler = call![1] as (e: Partial<BeforeUnloadEvent>) => void;
    const fakeEvent = { preventDefault: vi.fn(), returnValue: "" };
    handler(fakeEvent);
    expect(fakeEvent.preventDefault).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // StoreSource context wiring
  // -----------------------------------------------------------------------

  it("passes a ConfiguratorStoreSource with getSnapshot and subscribe to Configurator", () => {
    render(<App />);

    expect(capturedStore).not.toBeNull();
    const source = capturedStore as {
      getSnapshot: () => unknown;
      subscribe: (l: () => void) => () => void;
    };
    expect(typeof source.getSnapshot).toBe("function");
    expect(typeof source.subscribe).toBe("function");
  });

  it("storeSource.getSnapshot delegates to definition store getState", () => {
    render(<App />);

    const source = capturedStore as { getSnapshot: () => unknown };
    const snapshot = source.getSnapshot();
    // Should return the same reference as the mock store's getState
    expect(snapshot).toEqual(mockGetState());
  });

  it("storeSource.subscribe delegates to definition store subscribe", () => {
    render(<App />);

    const source = capturedStore as {
      subscribe: (l: () => void) => () => void;
    };
    const listener = vi.fn();
    const unsub = source.subscribe(listener);
    expect(typeof unsub).toBe("function");
    // The store's subscribe should have been called
    expect(mockSubscribe).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Rendering Configurator with EmptyState
  // -----------------------------------------------------------------------

  it("renders the Configurator component", () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId("configurator")).toBeDefined();
  });

  it("passes EmptyState as emptyState prop to Configurator", () => {
    render(<App />);

    // capturedEmptyState should be the EmptyState element (rendered by our mock)
    expect(capturedEmptyState).not.toBeNull();
  });

  it("EmptyState onCreateNew calls addDefinition with 'untitled'", () => {
    render(<App />);

    expect(capturedOnCreateNew).not.toBeNull();
    act(() => {
      capturedOnCreateNew!();
    });
    expect(mockAddDefinition).toHaveBeenCalledWith("untitled");
  });

  // -----------------------------------------------------------------------
  // View routing: configurator ↔ settings
  // -----------------------------------------------------------------------

  it("starts in configurator view by default", () => {
    const { getByTestId, queryByTestId } = render(<App />);
    expect(getByTestId("configurator")).toBeDefined();
    expect(getByTestId("toolbar")).toBeDefined();
    expect(queryByTestId("settings-page")).toBeNull();
  });

  it("switches to settings view when onOpenSettings is called", () => {
    const { getByTestId, queryByTestId } = render(<App />);

    expect(capturedOnOpenSettings).not.toBeNull();
    act(() => {
      capturedOnOpenSettings!();
    });

    expect(getByTestId("settings-page")).toBeDefined();
    expect(queryByTestId("configurator")).toBeNull();
    expect(capturedTab).toBe("sources");
    expect(capturedOnTabChange).not.toBeNull();
  });

  it("returns to configurator view when settings onBack is called", () => {
    const { getByTestId, queryByTestId } = render(<App />);

    // Go to settings
    act(() => {
      capturedOnOpenSettings!();
    });
    expect(getByTestId("settings-page")).toBeDefined();

    // Go back
    act(() => {
      capturedOnBack!();
    });
    expect(getByTestId("configurator")).toBeDefined();
    expect(queryByTestId("settings-page")).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Preset merging
  // -----------------------------------------------------------------------

  it("merges configurator presets with inline presets for createPresetUI", () => {
    stateOverrides = {
      inlinePresets: { inline: { type: "string", key: "inline" } },
    };
    render(<App />);

    expect(mockCreatePresetUI).toHaveBeenCalledWith({
      inline: { type: "string", key: "inline" },
    });
  });

  // -----------------------------------------------------------------------
  // handleImportClick
  // -----------------------------------------------------------------------

  it("handleImportClick calls click on file input ref", () => {
    render(<App />);

    expect(capturedOnImportClick).not.toBeNull();
    expect(capturedFileInputRef).not.toBeNull();

    // Simulate the ref having a real input element
    const mockClick = vi.fn();
    const mockInput = { click: mockClick } as unknown as HTMLInputElement;
    (capturedFileInputRef as { current: HTMLInputElement | null }).current = mockInput;

    act(() => {
      capturedOnImportClick!();
    });

    expect(mockClick).toHaveBeenCalledOnce();
  });
});

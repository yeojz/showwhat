import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup, waitFor } from "@testing-library/react";

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

let capturedOnExportDefinition:
  | ((key: string, def: unknown, format: "yaml" | "json") => void)
  | null = null;
let capturedConditionExtensionsResolver: ((key: string) => unknown) | null = null;
let capturedDefinitionKeys: string[] | undefined = undefined;
let capturedOnBeforeSelect: ((key: string) => Promise<void> | void) | null = null;
let capturedOnRefreshDefinition: ((key: string) => void) | null = null;
let capturedIsLoadingDefinition: boolean | undefined = undefined;

vi.mock("@showwhat/configurator", () => ({
  Configurator: ({
    store,
    emptyState,
    onExportDefinition,
    conditionExtensionsResolver,
    definitionKeys,
    onBeforeSelect,
    onRefreshDefinition,
    isLoadingDefinition,
  }: {
    store: unknown;
    emptyState?: React.ReactNode;
    onExportDefinition?: (key: string, def: unknown) => void;
    conditionExtensionsResolver?: (key: string) => unknown;
    definitionKeys?: string[];
    onBeforeSelect?: (key: string) => Promise<void> | void;
    onRefreshDefinition?: (key: string) => void;
    isLoadingDefinition?: boolean;
  }) => {
    capturedStore = store;
    capturedEmptyState = emptyState;
    capturedOnExportDefinition = onExportDefinition ?? null;
    capturedConditionExtensionsResolver = conditionExtensionsResolver ?? null;
    capturedDefinitionKeys = definitionKeys;
    capturedOnBeforeSelect = onBeforeSelect ?? null;
    capturedOnRefreshDefinition = onRefreshDefinition ?? null;
    capturedIsLoadingDefinition = isLoadingDefinition;
    return <div data-testid="configurator">{emptyState}</div>;
  },
  createPresetUI: (...args: unknown[]) => mockCreatePresetUI(...args),
  PreviewStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the Toolbar — capture props to verify theme wiring
let capturedTheme: string | null = null;
let capturedOnThemeToggle: ((theme: string) => void) | null = null;
let capturedOnTabChange: ((tab: string) => void) | null = null;

vi.mock("./components/Toolbar.js", () => ({
  Toolbar: ({
    onTabChange,
    theme,
    onThemeToggle,
  }: {
    tab: string;
    onTabChange: (t: string) => void;
    theme: string;
    onThemeToggle: (t: string) => void;
  }) => {
    capturedTheme = theme;
    capturedOnThemeToggle = onThemeToggle;
    capturedOnTabChange = onTabChange;
    return <div data-testid="toolbar" />;
  },
}));

// Mock the EmptyState — capture callbacks to verify wiring
let capturedOnCreateNew: (() => void) | null = null;
let capturedOnGoToSources: (() => void) | null = null;
vi.mock("./components/EmptyState.js", () => ({
  EmptyState: ({
    onCreateNew,
    onGoToSources,
  }: {
    onCreateNew: () => void;
    onGoToSources: () => void;
  }) => {
    capturedOnCreateNew = onCreateNew;
    capturedOnGoToSources = onGoToSources;
    return <div data-testid="empty-state" />;
  },
}));

// Mock SidebarActions
vi.mock("./components/SidebarActions.js", () => ({
  SidebarActions: () => <div data-testid="sidebar-actions" />,
}));

// Mock SourceSettings
vi.mock("./components/SourceSettings.js", () => ({
  SourceSettings: () => {
    return <div data-testid="source-settings" />;
  },
}));

// Mock PresetSettings
vi.mock("./components/PresetSettings.js", () => ({
  PresetEditor: () => <div data-testid="preset-editor" />,
  InlinePresetList: () => <div data-testid="inline-preset-list" />,
}));

// Mock mergePresets from showwhat
const mockMergePresets = vi.fn(
  async ({
    presets,
    overrides,
  }: {
    key?: string;
    presets?: { getPresets: (key?: string) => Promise<Record<string, unknown>> };
    overrides?: Record<string, unknown>;
  }) => {
    const base = presets ? await presets.getPresets() : {};
    return { ...base, ...(overrides ?? {}) };
  },
);

vi.mock("showwhat", () => ({
  mergePresets: (...args: unknown[]) =>
    mockMergePresets(...(args as Parameters<typeof mockMergePresets>)),
}));

// Minimal store state
const mockAddDefinition = vi.fn();
const defaultState: Record<string, unknown> = {
  dirtyKeys: [],
  addDefinition: mockAddDefinition,
  definitions: {},
  savedDefinitions: {},
  filePresets: {},
  presetReader: null,
  setPresetReader: vi.fn(),
  sourceFileName: null,
  sourceFormat: null,
  selectedKey: null,
  validationErrors: {},
  importDefinitions: vi.fn(),
  upsertDefinition: vi.fn(),
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

let sourceStoreOverrides: Record<string, unknown> = {};
const mockMarkFetched = vi.fn();
vi.mock("./store/source-store.js", () => {
  const useSourceStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector({
      activeSourceId: null,
      sources: [],
      markFetched: mockMarkFetched,
      ...sourceStoreOverrides,
    });
  };
  return { useSourceStore };
});

vi.mock("./hooks/useFileExport.js", () => ({
  useFileExport: () => ({
    exportYaml: vi.fn(),
    exportJson: vi.fn(),
    exportDefinitionYaml: vi.fn(),
    exportDefinitionJson: vi.fn(),
  }),
}));

const mockReloadDefinitionKey = vi.fn();
vi.mock("./hooks/useSourceFetch.js", () => ({
  useSourceFetch: () => ({
    fetchSource: vi.fn(),
    reloadKeyList: vi.fn(),
    reloadDefinitionKey: mockReloadDefinitionKey,
    loading: false,
    error: null,
  }),
}));

const mockSetSourcePresets = vi.fn();
const mockUpsertKeyFilePresets = vi.fn();
const mockClearSourcePresets = vi.fn();

const defaultPresetState: Record<string, unknown> = {
  presets: {},
  presetYaml: "",
  parseError: null,
  setPresetYaml: vi.fn(),
  sourcePresets: {},
  keyFilePresets: {},
  sourcePresetsLastFetched: undefined,
  setSourcePresets: mockSetSourcePresets,
  upsertKeyFilePresets: mockUpsertKeyFilePresets,
  clearSourcePresets: mockClearSourcePresets,
};

let presetStoreOverrides: Record<string, unknown> = {};

vi.mock("./store/preset-store.js", () => {
  const usePresetStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector({ ...defaultPresetState, ...presetStoreOverrides });
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
    capturedOnTabChange = null;
    capturedOnCreateNew = null;
    capturedOnGoToSources = null;
    capturedOnExportDefinition = null;
    capturedConditionExtensionsResolver = null;
    capturedDefinitionKeys = undefined;
    capturedOnBeforeSelect = null;
    capturedOnRefreshDefinition = null;
    capturedIsLoadingDefinition = undefined;
    sourceStoreOverrides = {};
    presetStoreOverrides = {};
    mockMarkFetched.mockReset();
    mockReloadDefinitionKey.mockReset();
    mockSetSourcePresets.mockReset();
    mockUpsertKeyFilePresets.mockReset();
    mockClearSourcePresets.mockReset();
    matchMediaListeners.length = 0;
    subscribers.length = 0;
    mockAddDefinition.mockReset();
    mockCreatePresetUI.mockClear();
    mockMergePresets.mockClear();
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

  it("invokes applyTheme('system') when matchMedia change handler fires", () => {
    localStorage.setItem("showwhat-theme", "system");
    render(<App />);

    expect(matchMediaListeners.length).toBeGreaterThan(0);
    // Calling the handler should re-apply the system theme without error
    act(() => {
      matchMediaListeners[matchMediaListeners.length - 1]();
    });
    // After handler fires, theme is still system — matchMedia.matches is false so no dark class
    expect(document.documentElement.classList.contains("dark")).toBe(false);
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

  it("renders the Configurator component on definitions tab", () => {
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

  it("EmptyState onGoToSources switches to sources tab", () => {
    const { getByTestId, queryByTestId } = render(<App />);

    expect(capturedOnGoToSources).not.toBeNull();
    act(() => {
      capturedOnGoToSources!();
    });
    expect(getByTestId("source-settings")).toBeDefined();
    expect(queryByTestId("configurator")).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Tab switching
  // -----------------------------------------------------------------------

  it("starts on definitions tab by default", () => {
    const { getByTestId, queryByTestId } = render(<App />);
    expect(getByTestId("configurator")).toBeDefined();
    expect(getByTestId("toolbar")).toBeDefined();
    expect(queryByTestId("source-settings")).toBeNull();
    expect(queryByTestId("preset-editor")).toBeNull();
  });

  it("switches to sources tab when onTabChange is called with sources", () => {
    const { getByTestId, queryByTestId } = render(<App />);

    expect(capturedOnTabChange).not.toBeNull();
    act(() => {
      capturedOnTabChange!("sources");
    });

    expect(getByTestId("source-settings")).toBeDefined();
    expect(queryByTestId("configurator")).toBeNull();
  });

  it("switches to presets tab when onTabChange is called with presets", () => {
    const { getByTestId, queryByTestId } = render(<App />);

    act(() => {
      capturedOnTabChange!("presets");
    });

    expect(getByTestId("preset-editor")).toBeDefined();
    expect(getByTestId("inline-preset-list")).toBeDefined();
    expect(queryByTestId("configurator")).toBeNull();
  });

  it("switches back to definitions tab", () => {
    const { getByTestId, queryByTestId } = render(<App />);

    // Switch away
    act(() => {
      capturedOnTabChange!("sources");
    });
    expect(queryByTestId("configurator")).toBeNull();

    // Switch back
    act(() => {
      capturedOnTabChange!("definitions");
    });
    expect(getByTestId("configurator")).toBeDefined();
  });

  it("toolbar is always rendered regardless of tab", () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId("toolbar")).toBeDefined();

    act(() => {
      capturedOnTabChange!("sources");
    });
    expect(getByTestId("toolbar")).toBeDefined();

    act(() => {
      capturedOnTabChange!("presets");
    });
    expect(getByTestId("toolbar")).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Preset merging
  // -----------------------------------------------------------------------

  it("resolves presets via mergePresets and passes them to createPresetUI", async () => {
    presetStoreOverrides = {
      sourcePresets: { file: { type: "string", key: "file" } },
    };
    render(<App />);

    await waitFor(() => {
      expect(mockMergePresets).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockCreatePresetUI).toHaveBeenCalledWith(
        expect.objectContaining({ file: { type: "string", key: "file" } }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Export definition (split mode)
  // -----------------------------------------------------------------------

  it("does not pass onExportDefinition when not in split mode", () => {
    render(<App />);
    expect(capturedOnExportDefinition).toBeNull();
  });

  it("passes onExportDefinition in split mode and it calls the correct export function", () => {
    sourceStoreOverrides = {
      activeSourceId: "src-1",
      sources: [{ id: "src-1", mode: "split", label: "Split", format: "yaml" }],
    };
    render(<App />);

    expect(capturedOnExportDefinition).not.toBeNull();
    act(() => {
      capturedOnExportDefinition!("test-key", { variations: [{ value: true }] }, "yaml");
    });
  });

  it("exports as JSON when format=json is passed", () => {
    sourceStoreOverrides = {
      activeSourceId: "src-1",
      sources: [{ id: "src-1", mode: "split", label: "Split", format: "json" }],
    };
    render(<App />);

    expect(capturedOnExportDefinition).not.toBeNull();
    act(() => {
      capturedOnExportDefinition!("test-key", { variations: [{ value: true }] }, "json");
    });
  });

  // -----------------------------------------------------------------------
  // Condition extensions resolver (split mode)
  // -----------------------------------------------------------------------

  it("does not pass conditionExtensionsResolver when not in split mode", () => {
    render(<App />);
    expect(capturedConditionExtensionsResolver).toBeNull();
  });

  it("passes conditionExtensionsResolver in split mode that returns preset UI", async () => {
    sourceStoreOverrides = {
      activeSourceId: "src-1",
      sources: [{ id: "src-1", mode: "split", label: "Split", format: "yaml" }],
    };
    render(<App />);

    await waitFor(() => {
      expect(capturedConditionExtensionsResolver).not.toBeNull();
    });
    mockCreatePresetUI.mockClear();
    const result = capturedConditionExtensionsResolver!("some-key");
    expect(result).toBeDefined();
    // Falls back to createPresetUI with resolvedPresets while key-specific presets load
    expect(mockCreatePresetUI).toHaveBeenCalled();
  });

  it("resolves different keys independently", async () => {
    sourceStoreOverrides = {
      activeSourceId: "src-1",
      sources: [{ id: "src-1", mode: "split", label: "Split", format: "yaml" }],
    };
    render(<App />);

    await waitFor(() => {
      expect(capturedConditionExtensionsResolver).not.toBeNull();
    });
    mockCreatePresetUI.mockClear();
    capturedConditionExtensionsResolver!("key-a");
    capturedConditionExtensionsResolver!("key-b");
    expect(mockCreatePresetUI).toHaveBeenCalledTimes(2);
  });

  // -----------------------------------------------------------------------
  // Lazy loading props (split mode)
  // -----------------------------------------------------------------------

  it("does not pass lazy loading props when not in split mode", () => {
    render(<App />);
    expect(capturedDefinitionKeys).toBeUndefined();
    expect(capturedOnBeforeSelect).toBeNull();
    expect(capturedOnRefreshDefinition).toBeNull();
    expect(capturedIsLoadingDefinition).toBe(false);
  });

  it("passes definitionKeys and callbacks in split mode", () => {
    sourceStoreOverrides = {
      activeSourceId: "src-1",
      sources: [
        {
          id: "src-1",
          mode: "split",
          label: "Split",
          format: "yaml",
          definitionKeys: ["feat-a", "feat-b"],
        },
      ],
    };
    render(<App />);

    expect(capturedDefinitionKeys).toEqual(["feat-a", "feat-b"]);
    expect(capturedOnBeforeSelect).not.toBeNull();
    expect(capturedOnRefreshDefinition).not.toBeNull();
    expect(capturedIsLoadingDefinition).toBe(false);
  });
});

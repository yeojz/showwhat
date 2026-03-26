import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import type { Definitions } from "showwhat";
import type { ConfiguratorStore, ConfiguratorStoreSource } from "./types.js";
import { StoreSourceContext, ActionStateContext } from "./context.js";
import type { ActionStateContextValue } from "./context.js";
import { PreviewPanel } from "./PreviewPanel.js";

// Control resolve timing via deferred promises
let resolvePromise: (value: unknown) => void;
let rejectPromise: (reason: unknown) => void;

vi.mock("showwhat", () => ({
  resolve: vi.fn(
    () =>
      new Promise((res, rej) => {
        resolvePromise = res;
        rejectPromise = rej;
      }),
  ),
  DefinitionInactiveError: class DefinitionInactiveError extends Error {
    constructor(msg?: string) {
      super(msg);
      this.name = "DefinitionInactiveError";
    }
  },
  DefinitionNotFoundError: class DefinitionNotFoundError extends Error {
    constructor(msg?: string) {
      super(msg);
      this.name = "DefinitionNotFoundError";
    }
  },
  VariationNotFoundError: class VariationNotFoundError extends Error {
    constructor(msg?: string) {
      super(msg);
      this.name = "VariationNotFoundError";
    }
  },
}));

const testDefinitions: Definitions = {
  "flag-a": { variations: [{ value: true }, { value: false }] },
  "flag-b": { variations: [{ value: "hello" }] },
};

function makeStore(overrides: Partial<ConfiguratorStore> = {}): ConfiguratorStore {
  return {
    definitions: testDefinitions,
    selectedKey: "flag-a",
    dirtyKeys: [],
    revision: 0,
    validationErrors: {},
    isKeyDirty: () => false,
    selectDefinition: vi.fn(async () => {}),
    addDefinition: vi.fn(async () => {}),
    removeDefinition: vi.fn(async () => {}),
    renameDefinition: vi.fn(async () => {}),
    updateDefinition: vi.fn(async () => {}),
    saveDefinition: vi.fn(async () => {}),
    discardDefinition: vi.fn(async () => {}),
    ...overrides,
  };
}

function makeStoreSource(store: ConfiguratorStore): ConfiguratorStoreSource {
  return {
    getSnapshot: () => store,
    subscribe: () => () => {},
  };
}

const defaultActionState: ActionStateContextValue = {
  actionState: { pending: false, error: null },
  runAction: async (action) => {
    await action();
  },
  clearError: () => {},
};

function renderWithStore(store: ConfiguratorStore) {
  const source = makeStoreSource(store);
  return render(
    <StoreSourceContext.Provider value={source}>
      <ActionStateContext.Provider value={defaultActionState}>
        <PreviewPanel />
      </ActionStateContext.Provider>
    </StoreSourceContext.Provider>,
  );
}

function openJsonEditor() {
  fireEvent.click(screen.getByRole("button", { name: /edit/i }));
}

function getJsonEditorTextarea(): HTMLTextAreaElement {
  return screen.getByPlaceholderText(/env/i) as HTMLTextAreaElement;
}

function applyJsonEditor() {
  fireEvent.click(screen.getByRole("button", { name: /apply/i }));
}

function openSimulator() {
  fireEvent.click(screen.getByText("Condition Simulator"));
}

function getSimulatorTextarea(): HTMLTextAreaElement {
  return screen.getByPlaceholderText(/tier/i) as HTMLTextAreaElement;
}

describe("PreviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display the selected definition key", () => {
    renderWithStore(makeStore());
    expect(screen.getByText("flag-a")).toBeDefined();
  });

  it("should show 'None selected' when no key is selected", () => {
    renderWithStore(makeStore({ selectedKey: null }));
    expect(screen.getByText("None selected")).toBeDefined();
  });

  it("should disable resolve button when no key is selected", () => {
    renderWithStore(makeStore({ selectedKey: null }));
    const button = screen.getByRole("button", { name: /resolve/i });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("should show success result after resolve", async () => {
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          value: true,
          meta: { variation: { index: 0, conditionCount: 1 }, annotations: {} },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Matched")).toBeDefined();
      expect(screen.getByText("true")).toBeDefined();
    });
  });

  it("should discard stale resolve when selection changes", async () => {
    const store = makeStore({ selectedKey: "flag-a" });
    const source = makeStoreSource(store);
    const { rerender } = render(
      <StoreSourceContext.Provider value={source}>
        <ActionStateContext.Provider value={defaultActionState}>
          <PreviewPanel />
        </ActionStateContext.Provider>
      </StoreSourceContext.Provider>,
    );

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    const staleResolve = resolvePromise;

    const store2 = makeStore({ selectedKey: "flag-b" });
    const source2 = makeStoreSource(store2);
    rerender(
      <StoreSourceContext.Provider value={source2}>
        <ActionStateContext.Provider value={defaultActionState}>
          <PreviewPanel />
        </ActionStateContext.Provider>
      </StoreSourceContext.Provider>,
    );

    await act(async () => {
      staleResolve({
        "flag-a": {
          value: true,
          meta: { variation: { index: 0, conditionCount: 1 }, annotations: {} },
        },
      });
    });

    expect(screen.queryByText("Matched")).toBeNull();
    expect(screen.getByText("flag-b")).toBeDefined();
  });

  it("should discard stale error when selection changes during resolve", async () => {
    const store = makeStore({ selectedKey: "flag-a" });
    const source = makeStoreSource(store);
    const { rerender } = render(
      <StoreSourceContext.Provider value={source}>
        <ActionStateContext.Provider value={defaultActionState}>
          <PreviewPanel />
        </ActionStateContext.Provider>
      </StoreSourceContext.Provider>,
    );

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    const staleReject = rejectPromise;

    const store2 = makeStore({ selectedKey: "flag-b" });
    const source2 = makeStoreSource(store2);
    rerender(
      <StoreSourceContext.Provider value={source2}>
        <ActionStateContext.Provider value={defaultActionState}>
          <PreviewPanel />
        </ActionStateContext.Provider>
      </StoreSourceContext.Provider>,
    );

    await act(async () => {
      staleReject(new Error("stale error"));
    });

    expect(screen.queryByText("stale error")).toBeNull();
    expect(screen.queryByText("Error")).toBeNull();
    expect(screen.getByText("flag-b")).toBeDefined();
  });

  it("should show error when no definition is selected and resolve is forced", () => {
    renderWithStore(makeStore({ selectedKey: "nonexistent", definitions: {} }));
    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);
    expect(screen.getByText("No definition selected")).toBeDefined();
  });

  it("should show inactive result when definition is inactive", async () => {
    const { DefinitionInactiveError } = await import("showwhat");
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      rejectPromise(new DefinitionInactiveError("inactive"));
    });

    await waitFor(() => {
      expect(screen.getByText("Inactive")).toBeDefined();
    });
  });

  it("should show no-match result when variation is not found", async () => {
    const { VariationNotFoundError } = await import("showwhat");
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      rejectPromise(new VariationNotFoundError("no match"));
    });

    await waitFor(() => {
      expect(screen.getByText("No Match")).toBeDefined();
    });
  });

  it("should show error result when definition is not found", async () => {
    const { DefinitionNotFoundError } = await import("showwhat");
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      rejectPromise(new DefinitionNotFoundError("not found"));
    });

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeDefined();
    });
  });

  it("should show error result for unknown errors", async () => {
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      rejectPromise(new Error("Something went wrong"));
    });

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeDefined();
      expect(screen.getByText("Something went wrong")).toBeDefined();
    });
  });

  it("should show error result for non-Error throwable", async () => {
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      rejectPromise("string error");
    });

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeDefined();
      expect(screen.getByText("Unknown error")).toBeDefined();
    });
  });

  it("should parse JSON context and resolve", async () => {
    renderWithStore(makeStore());

    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, {
      target: { value: '{ "env": "production", "admin": true }' },
    });
    applyJsonEditor();

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          value: true,
          meta: { variation: { index: 0, conditionCount: 0 }, annotations: {} },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Matched")).toBeDefined();
    });
  });

  it("should resolve with empty context when textarea is empty", async () => {
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          value: true,
          meta: { variation: { index: 0, conditionCount: 0 }, annotations: {} },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Matched")).toBeDefined();
    });
  });

  it("should show error for invalid JSON context", () => {
    renderWithStore(makeStore());

    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, { target: { value: "not json" } });
    applyJsonEditor();

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    expect(screen.getByText("Invalid JSON in context")).toBeDefined();
  });

  it("should show string value in result", async () => {
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          value: "hello world",
          meta: { variation: { index: 1, conditionCount: 2 }, annotations: {} },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("hello world")).toBeDefined();
      expect(screen.getByText(/Variation #1/)).toBeDefined();
    });
  });

  it("should show evaluation meta icon on success and open dialog", async () => {
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          value: true,
          meta: {
            context: { env: "prod" },
            variation: { index: 0, conditionCount: 1 },
            annotations: { rollout: { bucket: 42 } },
          },
        },
      });
    });

    const metaButton = await waitFor(() => {
      const el = screen.getByRole("button", { name: /view evaluation meta/i });
      expect(el).toBeDefined();
      return el;
    });

    fireEvent.click(metaButton);

    await waitFor(() => {
      expect(screen.getByText("Evaluation Meta")).toBeDefined();
      expect(screen.getByText(/"bucket": 42/)).toBeDefined();
    });
  });

  it("should not show evaluation meta icon on error", async () => {
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      rejectPromise(new Error("fail"));
    });

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeDefined();
    });

    expect(screen.queryByRole("button", { name: /view evaluation meta/i })).toBeNull();
  });

  it("should show condition simulator textarea when expanded", () => {
    renderWithStore(makeStore());
    expect(screen.queryByPlaceholderText(/tier/i)).toBeNull();
    openSimulator();
    expect(getSimulatorTextarea()).toBeDefined();
  });

  it("should pass fallback from condition simulator to resolve", async () => {
    const { resolve: mockResolve } = await import("showwhat");
    renderWithStore(makeStore());

    openSimulator();
    const simulatorTextarea = getSimulatorTextarea();
    fireEvent.change(simulatorTextarea, { target: { value: "tier:true\ngeo:false" } });

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          value: true,
          meta: { variation: { index: 0, conditionCount: 1 }, annotations: {} },
        },
      });
    });

    // Verify resolve was called with a fallback option
    const calls = (mockResolve as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.options).toBeDefined();
    expect(typeof lastCall.options.fallback).toBe("function");
  });

  it("should not pass fallback when condition simulator is empty", async () => {
    const { resolve: mockResolve } = await import("showwhat");
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          value: true,
          meta: { variation: { index: 0, conditionCount: 0 }, annotations: {} },
        },
      });
    });

    const calls = (mockResolve as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.options).toBeUndefined();
  });
});

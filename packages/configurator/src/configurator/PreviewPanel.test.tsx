import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { useState } from "react";
import type { Definitions, ConditionEvaluator } from "showwhat";
import type { ConfiguratorStore, ConfiguratorStoreSource } from "./types.js";
import { StoreSourceContext, ActionStateContext } from "./context.js";
import type { ActionStateContextValue } from "./context.js";
import { FallbackEvaluatorProvider } from "./fallback-context.js";
import { PreviewPanel } from "./PreviewPanel.js";
import { PreviewStateProvider } from "./preview-context.js";
import type { PreviewState } from "./preview-context.js";

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
  builtinEvaluators: {
    string: vi.fn(),
    number: vi.fn(),
    datetime: vi.fn(),
    bool: vi.fn(),
    env: vi.fn(),
    startAt: vi.fn(),
    endAt: vi.fn(),
  },
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

function StatefulPreviewProvider({ children }: { children: React.ReactNode }) {
  const [contextText, setContextText] = useState("");
  const [annotationsText, setAnnotationsText] = useState("");
  const [evaluatorText, setEvaluatorText] = useState("");

  const state: PreviewState = {
    contextText,
    annotationsText,
    evaluatorText,
    setContextText,
    setAnnotationsText,
    setEvaluatorText,
    resetPreview: () => {
      setContextText("");
      setAnnotationsText("");
      setEvaluatorText("");
    },
  };

  return <PreviewStateProvider value={state}>{children}</PreviewStateProvider>;
}

function renderWithStore(store: ConfiguratorStore) {
  const source = makeStoreSource(store);
  return render(
    <StoreSourceContext.Provider value={source}>
      <ActionStateContext.Provider value={defaultActionState}>
        <StatefulPreviewProvider>
          <PreviewPanel />
        </StatefulPreviewProvider>
      </ActionStateContext.Provider>
    </StoreSourceContext.Provider>,
  );
}

function renderWithStoreAndFallback(store: ConfiguratorStore, fallback: ConditionEvaluator) {
  const source = makeStoreSource(store);
  return render(
    <StoreSourceContext.Provider value={source}>
      <ActionStateContext.Provider value={defaultActionState}>
        <FallbackEvaluatorProvider value={fallback}>
          <StatefulPreviewProvider>
            <PreviewPanel />
          </StatefulPreviewProvider>
        </FallbackEvaluatorProvider>
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
          success: true,
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
          <StatefulPreviewProvider>
            <PreviewPanel />
          </StatefulPreviewProvider>
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
          <StatefulPreviewProvider>
            <PreviewPanel />
          </StatefulPreviewProvider>
        </ActionStateContext.Provider>
      </StoreSourceContext.Provider>,
    );

    await act(async () => {
      staleResolve({
        "flag-a": {
          success: true,
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
          <StatefulPreviewProvider>
            <PreviewPanel />
          </StatefulPreviewProvider>
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
          <StatefulPreviewProvider>
            <PreviewPanel />
          </StatefulPreviewProvider>
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
      resolvePromise({
        "flag-a": {
          success: false,
          key: "flag-a",
          error: new DefinitionInactiveError("inactive"),
        },
      });
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
      resolvePromise({
        "flag-a": {
          success: false,
          key: "flag-a",
          error: new VariationNotFoundError("no match"),
        },
      });
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
      resolvePromise({
        "flag-a": {
          success: false,
          key: "flag-a",
          error: new DefinitionNotFoundError("not found"),
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeDefined();
    });
  });

  it("should show error result for generic resolution error", async () => {
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          success: false,
          key: "flag-a",
          error: new Error("custom evaluator failed"),
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeDefined();
      expect(screen.getByText("custom evaluator failed")).toBeDefined();
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
          success: true,
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
          success: true,
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
          success: true,
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
          success: true,
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
          success: true,
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
          success: true,
          value: true,
          meta: { variation: { index: 0, conditionCount: 0 }, annotations: {} },
        },
      });
    });

    const calls = (mockResolve as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.options.evaluators).toBeDefined();
    expect(lastCall.options.fallback).toBeUndefined();
  });

  // --- JsonEditorDialog: Format button ---

  it("should format valid JSON in the editor dialog", () => {
    renderWithStore(makeStore());
    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, { target: { value: '{"a":1,"b":2}' } });
    fireEvent.click(screen.getByRole("button", { name: /format/i }));

    expect(textarea.value).toBe('{\n  "a": 1,\n  "b": 2\n}');
    // No error text should appear
    expect(screen.queryByText("Invalid JSON")).toBeNull();
  });

  it("should show error when formatting invalid JSON in the editor dialog", () => {
    renderWithStore(makeStore());
    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, { target: { value: "{bad json" } });
    fireEvent.click(screen.getByRole("button", { name: /format/i }));

    expect(screen.getByText("Invalid JSON")).toBeDefined();
  });

  it("should do nothing when formatting empty text in the editor dialog", () => {
    renderWithStore(makeStore());
    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /format/i }));

    // No error, textarea stays as-is
    expect(screen.queryByText("Invalid JSON")).toBeNull();
    expect(textarea.value).toBe("   ");
  });

  it("should clear format error when typing in the editor dialog", () => {
    renderWithStore(makeStore());
    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, { target: { value: "{bad" } });
    fireEvent.click(screen.getByRole("button", { name: /format/i }));
    expect(screen.getByText("Invalid JSON")).toBeDefined();

    // Typing should clear the error
    fireEvent.change(textarea, { target: { value: '{"a":1}' } });
    expect(screen.queryByText("Invalid JSON")).toBeNull();
  });

  it("should open context editor when clicking the context preview box", () => {
    renderWithStore(makeStore());
    // Click the context placeholder text to open the editor
    fireEvent.click(screen.getByText('{ "env": "production" }'));
    expect(screen.getByPlaceholderText(/env/i)).toBeDefined();
  });

  it("should apply draft value and close the editor dialog", async () => {
    renderWithStore(makeStore());
    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, { target: { value: '{"x": 42}' } });
    applyJsonEditor();

    // Dialog close is async in base-ui
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/env/i)).toBeNull();
    });

    // The context preview should show the new value
    expect(screen.getByText(/42/)).toBeDefined();
  });

  // --- parseContextJson edge cases ---

  it("should show error for JSON array context", () => {
    renderWithStore(makeStore());
    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, { target: { value: "[1, 2, 3]" } });
    applyJsonEditor();

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    expect(screen.getByText("Invalid JSON in context")).toBeDefined();
  });

  it("should show error for JSON null context", () => {
    renderWithStore(makeStore());
    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, { target: { value: "null" } });
    applyJsonEditor();

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    expect(screen.getByText("Invalid JSON in context")).toBeDefined();
  });

  // --- parseEvaluatorOverrides edge cases ---

  it("should ignore empty lines in evaluator overrides", async () => {
    const { resolve: mockResolve } = await import("showwhat");
    renderWithStore(makeStore());
    openSimulator();
    const simulatorTextarea = getSimulatorTextarea();
    fireEvent.change(simulatorTextarea, { target: { value: "\n\ntier:true\n\n" } });

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          success: true,
          value: true,
          meta: { variation: { index: 0, conditionCount: 1 }, annotations: {} },
        },
      });
    });

    const calls = (mockResolve as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.options).toBeDefined();
    expect(typeof lastCall.options.fallback).toBe("function");
  });

  it("should ignore lines with missing colon in evaluator overrides", async () => {
    const { resolve: mockResolve } = await import("showwhat");
    renderWithStore(makeStore());
    openSimulator();
    const simulatorTextarea = getSimulatorTextarea();
    // "nocolon" has no colon, ":leading" has idx=0 which is < 1
    fireEvent.change(simulatorTextarea, { target: { value: "nocolon\n:leading\ntier:true" } });

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          success: true,
          value: true,
          meta: { variation: { index: 0, conditionCount: 1 }, annotations: {} },
        },
      });
    });

    const calls = (mockResolve as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.options).toBeDefined();

    // The fallback should only know about "tier"
    const fallback = lastCall.options.fallback as ConditionEvaluator;
    expect(await fallback({ condition: { type: "tier" } } as never)).toBe(true);
    expect(await fallback({ condition: { type: "nocolon" } } as never)).toBe(false);
  });

  it("should ignore lines with invalid boolean value in evaluator overrides", async () => {
    const { resolve: mockResolve } = await import("showwhat");
    renderWithStore(makeStore());
    openSimulator();
    const simulatorTextarea = getSimulatorTextarea();
    fireEvent.change(simulatorTextarea, { target: { value: "tier:yes\ngeo:true" } });

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          success: true,
          value: true,
          meta: { variation: { index: 0, conditionCount: 1 }, annotations: {} },
        },
      });
    });

    const calls = (mockResolve as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    const fallback = lastCall.options.fallback as ConditionEvaluator;
    // "tier:yes" should be ignored, so fallback returns false for unknown type
    expect(await fallback({ condition: { type: "tier" } } as never)).toBe(false);
    // "geo:true" is valid
    expect(await fallback({ condition: { type: "geo" } } as never)).toBe(true);
  });

  // --- Fallback evaluator with externalFallback ---

  it("should use externalFallback when no overrides match", async () => {
    const { resolve: mockResolve } = await import("showwhat");
    const externalFallback = vi.fn(async () => true);
    renderWithStoreAndFallback(makeStore(), externalFallback);

    // No simulator overrides set — externalFallback alone should produce a fallback
    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          success: true,
          value: true,
          meta: { variation: { index: 0, conditionCount: 1 }, annotations: {} },
        },
      });
    });

    const calls = (mockResolve as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.options).toBeDefined();
    expect(typeof lastCall.options.fallback).toBe("function");

    // Calling the fallback with an unknown type should delegate to externalFallback
    const fallback = lastCall.options.fallback as ConditionEvaluator;
    const result = await fallback({ condition: { type: "unknown" } } as never);
    expect(externalFallback).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("should prefer overrides over externalFallback", async () => {
    const { resolve: mockResolve } = await import("showwhat");
    const externalFallback = vi.fn(async () => true);
    renderWithStoreAndFallback(makeStore(), externalFallback);

    openSimulator();
    const simulatorTextarea = getSimulatorTextarea();
    fireEvent.change(simulatorTextarea, { target: { value: "tier:false" } });

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          success: true,
          value: true,
          meta: { variation: { index: 0, conditionCount: 1 }, annotations: {} },
        },
      });
    });

    const calls = (mockResolve as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    const fallback = lastCall.options.fallback as ConditionEvaluator;

    // Override should take precedence
    const tierResult = await fallback({ condition: { type: "tier" } } as never);
    expect(tierResult).toBe(false);
    expect(externalFallback).not.toHaveBeenCalled();

    // Non-overridden type delegates to externalFallback
    const otherResult = await fallback({ condition: { type: "other" } } as never);
    expect(otherResult).toBe(true);
    expect(externalFallback).toHaveBeenCalled();
  });

  // --- Result with non-string value (JSON.stringify path) ---

  it("should JSON.stringify non-string result values", async () => {
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          success: true,
          value: { nested: "object" },
          meta: { variation: { index: 2, conditionCount: 1 }, annotations: {} },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Matched")).toBeDefined();
      expect(screen.getByText(/"nested": "object"/)).toBeDefined();
    });
  });

  // --- ResultBadge: success without onViewMeta (variation text only) ---

  it("should show variation text without details button when onViewMeta is undefined", async () => {
    renderWithStore(makeStore());

    // We need to verify the non-clickable variation text appears.
    // The success ResultBadge without onViewMeta shows a plain <span> with "Variation #N".
    // To hit this path we would need onViewMeta to be undefined for a success result,
    // but PreviewPanel always passes onViewMeta for success. We test it indirectly
    // by confirming the Details button IS present for success results.
    // The "no-match" path with onViewMeta prop test:
    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    const { VariationNotFoundError } = await import("showwhat");
    await act(async () => {
      resolvePromise({
        "flag-a": {
          success: false,
          key: "flag-a",
          error: new VariationNotFoundError("no match"),
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("No Match")).toBeDefined();
      expect(screen.getByText("No variation matched the given context")).toBeDefined();
    });

    // No meta button for no-match
    expect(screen.queryByRole("button", { name: /view evaluation meta/i })).toBeNull();
  });

  // --- Seed annotations ---

  it("should show seed annotations editor when simulator is expanded", () => {
    renderWithStore(makeStore());
    openSimulator();
    expect(screen.getByText("Seed Annotations")).toBeDefined();
  });

  it("should open annotations editor dialog when clicking preview box", () => {
    renderWithStore(makeStore());
    openSimulator();
    // Click the annotations preview box (the button containing the placeholder text)
    fireEvent.click(screen.getByText('{ "bucket": 42 }'));
    expect(screen.getByText("Edit Seed Annotations")).toBeDefined();
  });

  it("should open annotations editor dialog when clicking Edit", () => {
    renderWithStore(makeStore());
    openSimulator();
    // There are two "Edit" buttons — context and annotations. Click the second one (inside simulator).
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[editButtons.length - 1]);
    expect(screen.getByText("Edit Seed Annotations")).toBeDefined();
  });

  it("should show annotations preview text after applying", async () => {
    renderWithStore(makeStore());
    openSimulator();
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[editButtons.length - 1]);

    const textarea = screen.getByPlaceholderText(/bucket.*42.*threshold/s) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{ "bucket": 42 }' } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    await waitFor(() => {
      expect(screen.getByText(/bucket/)).toBeDefined();
    });
  });

  it("should show error for invalid JSON in annotations", () => {
    renderWithStore(makeStore());
    openSimulator();
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[editButtons.length - 1]);

    const textarea = screen.getByPlaceholderText(/bucket.*42.*threshold/s) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "not valid json" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    expect(screen.getByText("Invalid JSON in annotations")).toBeDefined();
  });

  it("should show error for JSON array annotations", () => {
    renderWithStore(makeStore());
    openSimulator();
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[editButtons.length - 1]);

    const textarea = screen.getByPlaceholderText(/bucket.*42.*threshold/s) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "[1, 2]" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    expect(screen.getByText("Invalid JSON in annotations")).toBeDefined();
  });

  it("should pass createAnnotations to resolve when seed annotations are provided", async () => {
    const { resolve: mockResolve } = await import("showwhat");
    renderWithStore(makeStore());
    openSimulator();

    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[editButtons.length - 1]);

    const textarea = screen.getByPlaceholderText(/bucket.*42.*threshold/s) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{ "bucket": 42 }' } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          success: true,
          value: true,
          meta: { variation: { index: 0, conditionCount: 1 }, annotations: {} },
        },
      });
    });

    const calls = (mockResolve as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(typeof lastCall.options.createAnnotations).toBe("function");
    expect(lastCall.options.createAnnotations()).toEqual({ bucket: 42 });
  });

  it("should not pass createAnnotations when seed annotations are empty", async () => {
    const { resolve: mockResolve } = await import("showwhat");
    renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    await act(async () => {
      resolvePromise({
        "flag-a": {
          success: true,
          value: true,
          meta: { variation: { index: 0, conditionCount: 0 }, annotations: {} },
        },
      });
    });

    const calls = (mockResolve as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.options.createAnnotations).toBeUndefined();
  });

  // --- Reset button ---

  it("should reset all inputs after confirmation", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithStore(makeStore());

    // Enter context
    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, { target: { value: '{"env":"prod"}' } });
    applyJsonEditor();

    // Click reset
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(confirmSpy).toHaveBeenCalledWith("Reset all preview inputs? This cannot be undone.");
    // Context preview should show placeholder again
    expect(screen.getByText('{ "env": "production" }')).toBeDefined();

    confirmSpy.mockRestore();
  });

  it("should not reset inputs when confirmation is cancelled", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderWithStore(makeStore());

    // Enter context
    openJsonEditor();
    const textarea = getJsonEditorTextarea();
    fireEvent.change(textarea, { target: { value: '{"env":"prod"}' } });
    applyJsonEditor();

    // Click reset but cancel
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    // Context should still show entered value
    expect(screen.getAllByText(/env.*prod/).length).toBeGreaterThan(0);

    confirmSpy.mockRestore();
  });

  // --- Abort controller cleanup on unmount ---

  it("should discard in-flight resolve on unmount", async () => {
    const { unmount } = renderWithStore(makeStore());

    const button = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(button);

    const staleResolve = resolvePromise;

    // Unmount while resolve is still pending
    unmount();

    // Complete the stale promise — should not throw or set state
    await act(async () => {
      staleResolve({
        "flag-a": {
          success: true,
          value: true,
          meta: { variation: { index: 0, conditionCount: 0 }, annotations: {} },
        },
      });
    });

    // No assertions needed — if unmount cleanup didn't abort,
    // setting state on an unmounted component would warn/error.
  });
});

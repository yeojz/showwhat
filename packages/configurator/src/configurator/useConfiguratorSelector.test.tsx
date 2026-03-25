import { describe, expect, it, vi } from "vitest";
import { render, act } from "@testing-library/react";
import React from "react";
import { StoreSourceContext, ActionStateContext } from "./context.js";
import type { ActionStateContextValue } from "./context.js";
import { useConfiguratorSelector } from "./useConfiguratorSelector.js";
import type { ConfiguratorStore, ConfiguratorStoreSource } from "./types.js";
import type { Definition, Definitions } from "@showwhat/core/schemas";

const baseDef: Definition = { variations: [{ value: "on" }] };

function createTestStore(
  overrides: Partial<ConfiguratorStore> = {},
): ConfiguratorStore & ConfiguratorStoreSource {
  const defs: Definitions = { "feature-a": baseDef };
  let state: ConfiguratorStore;
  const listeners = new Set<() => void>();

  state = {
    definitions: defs,
    selectedKey: "feature-a",
    dirtyKeys: [],
    revision: 0,
    validationErrors: {},
    isKeyDirty: () => false,
    selectDefinition: vi.fn(async () => {}),
    addDefinition: vi.fn(async () => {}),
    removeDefinition: vi.fn(async () => {}),
    renameDefinition: vi.fn(async () => {}),
    updateDefinition: vi.fn(async (key: string, def: Definition) => {
      state = {
        ...state,
        definitions: { ...state.definitions, [key]: def },
      };
      listeners.forEach((l) => l());
    }),
    saveDefinition: vi.fn(async () => {}),
    discardDefinition: vi.fn(async () => {}),
    ...overrides,
  } as ConfiguratorStore;

  return Object.assign(state, {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return state;
    },
  });
}

const defaultActionState: ActionStateContextValue = {
  actionState: { pending: false, error: null },
  runAction: async (action) => {
    await action();
  },
  clearError: () => {},
};

function renderWithConfigurator(source: ConfiguratorStoreSource, children: React.ReactNode) {
  return render(
    <StoreSourceContext.Provider value={source}>
      <ActionStateContext.Provider value={defaultActionState}>
        {children}
      </ActionStateContext.Provider>
    </StoreSourceContext.Provider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useConfiguratorSelector", () => {
  it("does not rerender selector consumers when unrelated store fields change", async () => {
    const renderCount = { selectedKey: 0 };
    const store = createTestStore();

    function SelectedKeyProbe() {
      const selectedKey = useConfiguratorSelector((s) => s.selectedKey);
      renderCount.selectedKey++;
      return <div>{selectedKey}</div>;
    }

    renderWithConfigurator(store, <SelectedKeyProbe />);

    await act(() => store.updateDefinition("feature-a", { variations: [{ value: "x" }] }));

    expect(renderCount.selectedKey).toBe(1);
  });

  it("rerenders when the selected slice changes", async () => {
    const renderCount = { selectedKey: 0 };
    const listeners = new Set<() => void>();
    let currentState: ConfiguratorStore;

    const store = createTestStore();
    const mutableStore = store as ConfiguratorStore &
      ConfiguratorStoreSource & {
        selectDefinition: ReturnType<typeof vi.fn>;
      };

    mutableStore.selectDefinition = vi.fn(async (key: string | null) => {
      currentState = { ...currentState, selectedKey: key };
      listeners.forEach((l) => l());
    });

    currentState = store;
    mutableStore.subscribe = (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
    mutableStore.getSnapshot = () => currentState;

    function SelectedKeyProbe() {
      const selectedKey = useConfiguratorSelector((s) => s.selectedKey);
      renderCount.selectedKey++;
      return <div data-testid="key">{selectedKey}</div>;
    }

    const { getByTestId } = renderWithConfigurator(store, <SelectedKeyProbe />);

    expect(getByTestId("key").textContent).toBe("feature-a");

    await act(() => mutableStore.selectDefinition("feature-b"));

    expect(renderCount.selectedKey).toBe(2);
    expect(getByTestId("key").textContent).toBe("feature-b");
  });
});

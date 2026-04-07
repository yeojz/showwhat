import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { Configurator } from "./Configurator.js";
import type { ConfiguratorStore } from "./types.js";
import type { Definition, Definitions } from "showwhat";

const baseDef: Definition = {
  variations: [{ value: "on" }],
};

function createMockStore(overrides: Partial<ConfiguratorStore> = {}): ConfiguratorStore {
  const defs: Definitions = { "flag-a": baseDef };
  return {
    definitions: defs,
    selectedKey: "flag-a",
    dirtyKeys: ["flag-a"],
    revision: 0,
    validationErrors: {},
    isKeyDirty: (k) => k === "flag-a",
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

/**
 * Returns a promise and its resolve/reject handles so tests can control
 * when an async store action settles.
 */
function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Creates a store where specific actions reject with the given errors.
 * Other actions resolve immediately.
 */
function createRejectingStore(
  rejects: Partial<Record<"addDefinition" | "renameDefinition", Error>>,
): ConfiguratorStore {
  const defs: Definitions = { "feature-a": baseDef };
  return {
    definitions: defs,
    selectedKey: "feature-a",
    dirtyKeys: [],
    revision: 0,
    validationErrors: {},
    isKeyDirty: () => false,
    selectDefinition: vi.fn(async () => {}),
    addDefinition: vi.fn(async () => {
      if (rejects.addDefinition) throw rejects.addDefinition;
    }),
    removeDefinition: vi.fn(async () => {}),
    renameDefinition: vi.fn(async () => {
      if (rejects.renameDefinition) throw rejects.renameDefinition;
    }),
    updateDefinition: vi.fn(async () => {}),
    saveDefinition: vi.fn(async () => {}),
    discardDefinition: vi.fn(async () => {}),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Configurator", () => {
  it("renders with a ConfiguratorStoreSource (subscribe/getSnapshot)", () => {
    const store = createMockStore();
    const source = {
      getSnapshot: () => store,
      subscribe: () => () => {},
    };
    render(<Configurator store={source} />);
    expect(screen.getAllByText("flag-a").length).toBeGreaterThan(0);
  });

  it("renders empty state when definitions are empty", () => {
    const store = createMockStore({
      definitions: {},
      selectedKey: null,
    });
    render(<Configurator store={store} emptyState={<div>No definitions yet</div>} />);
    expect(screen.getByText("No definitions yet")).toBeDefined();
  });

  it("renders 'Select a definition to edit' when no key is selected", () => {
    const store = createMockStore({ selectedKey: null });
    render(<Configurator store={store} />);
    expect(screen.getByText("Select a definition to edit")).toBeDefined();
  });

  it("applies custom className", () => {
    const store = createMockStore();
    const { container } = render(<Configurator store={store} className="my-custom" />);
    expect(container.querySelector(".my-custom")).toBeDefined();
  });

  it("passes definitionKeys to DefinitionList when provided", () => {
    const store = createMockStore({
      definitions: { "flag-a": baseDef },
      selectedKey: null,
    });
    render(<Configurator store={store} definitionKeys={["flag-a", "flag-b", "flag-c"]} />);
    // flag-b and flag-c should appear in the sidebar even though they're not in definitions
    expect(screen.getByText("flag-b")).toBeDefined();
    expect(screen.getByText("flag-c")).toBeDefined();
  });

  it("calls onBeforeSelect before selectDefinition when clicking a sidebar key", async () => {
    const callOrder: string[] = [];
    const onBeforeSelect = vi.fn(async () => {
      callOrder.push("before");
    });
    const store = createMockStore({
      definitions: {
        "flag-a": baseDef,
        "flag-b": { variations: [{ value: "off" }] },
      },
      selectDefinition: vi.fn(async () => {
        callOrder.push("select");
      }),
    });
    const user = userEvent.setup();
    render(<Configurator store={store} onBeforeSelect={onBeforeSelect} />);
    await user.click(screen.getByText("flag-b"));
    expect(onBeforeSelect).toHaveBeenCalledWith("flag-b");
    expect(store.selectDefinition).toHaveBeenCalledWith("flag-b");
    expect(callOrder).toEqual(["before", "select"]);
  });

  it("shows loading indicator when isLoadingDefinition is true and no definition is selected", () => {
    const store = createMockStore({
      selectedKey: "unfetched-key",
      definitions: {},
    });
    render(<Configurator store={store} isLoadingDefinition={true} />);
    expect(screen.queryByText("Select a definition to edit")).toBeNull();
    expect(screen.getByText("Loading definition\u2026")).toBeDefined();
  });
});

describe("Configurator editor interactions", () => {
  it("calls selectDefinition when a definition is clicked in the sidebar", async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      definitions: {
        "flag-a": baseDef,
        "flag-b": { variations: [{ value: "off" }] },
      },
    });
    render(<Configurator store={store} />);
    // Click on flag-b in the sidebar
    await user.click(screen.getByText("flag-b"));
    expect(store.selectDefinition).toHaveBeenCalledWith("flag-b");
  });

  it("calls removeDefinition when delete is confirmed", async () => {
    const user = userEvent.setup();
    const store = createMockStore();
    render(<Configurator store={store} />);
    // The Delete button is now in the editor action bar
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);
    // Confirm the deletion
    const confirmButton = await screen.findByRole("button", { name: "Delete" });
    await user.click(confirmButton);
    expect(store.removeDefinition).toHaveBeenCalledWith("flag-a");
  });

  it("calls updateDefinition when the active toggle is changed", async () => {
    const user = userEvent.setup();
    const store = createMockStore();
    render(<Configurator store={store} />);
    const activeSwitch = screen.getByRole("switch");
    await user.click(activeSwitch);
    expect(store.updateDefinition).toHaveBeenCalled();
  });
});

describe("Configurator async action handling", () => {
  it("disables Save and Discard buttons while a save action is pending", async () => {
    const { promise, resolve } = deferred();
    const store = createMockStore({
      saveDefinition: vi.fn(() => promise),
    });

    render(<Configurator store={store} />);

    const saveButton = screen.getByRole("button", { name: /^save$/i });
    const discardButton = screen.getByRole("button", { name: /discard/i });

    // Both should be enabled initially (isDirty is true)
    expect(saveButton).toBeEnabled();
    expect(discardButton).toBeEnabled();

    // Click save — action is now pending
    await userEvent.click(saveButton);

    // Buttons should be disabled while pending
    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });
    expect(discardButton).toBeDisabled();

    // Resolve the action
    resolve();

    // Buttons should re-enable (still dirty since store mock doesn't change state)
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
    expect(discardButton).toBeEnabled();
  });

  it("shows an error banner when a store action rejects", async () => {
    const { promise, reject } = deferred();
    const store = createMockStore({
      saveDefinition: vi.fn(() => promise),
    });

    render(<Configurator store={store} />);

    const saveButton = screen.getByRole("button", { name: /^save$/i });
    await userEvent.click(saveButton);

    // Reject with an error
    reject(new Error("Network failure"));

    // Error banner should appear
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByText(/network failure/i)).toBeInTheDocument();

    // Dismiss the error
    const dismissButton = screen.getByText(/dismiss/i);
    await userEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("disables buttons during discard action", async () => {
    const { promise, resolve } = deferred();
    const store = createMockStore({
      discardDefinition: vi.fn(() => promise),
    });

    render(<Configurator store={store} />);

    const discardButton = screen.getByRole("button", { name: /discard/i });
    await userEvent.click(discardButton);

    // Confirm the discard in the alert dialog
    const confirmButton = await screen.findByRole("button", { name: /^discard$/i });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(discardButton).toBeDisabled();
    });

    resolve();

    await waitFor(() => {
      expect(discardButton).toBeEnabled();
    });
  });

  it("keeps the add-definition form open when addDefinition rejects", async () => {
    const user = userEvent.setup();
    const store = createRejectingStore({ addDefinition: new Error("add failed") });
    render(<Configurator store={store} />);

    await user.click(screen.getByText("New definition"));
    const input = screen.getByPlaceholderText("definition-key");
    await user.type(input, "new-flag");
    // Submit via Enter to avoid ambiguity with the editor Save button
    await user.keyboard("{Enter}");

    expect(await screen.findByText(/add failed/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("new-flag")).toBeInTheDocument();
  });

  it("swallows updateDefinition rejection without crashing", async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      updateDefinition: vi.fn(async () => {
        throw new Error("update failed");
      }),
    });
    render(<Configurator store={store} />);
    // Toggling the active switch triggers onUpdate -> updateDefinition -> .catch(() => {})
    const activeSwitch = screen.getByRole("switch");
    await user.click(activeSwitch);
    expect(store.updateDefinition).toHaveBeenCalled();
    // No error banner because onUpdate doesn't use runAction
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("swallows selectDefinition rejection without crashing", async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      definitions: {
        "flag-a": baseDef,
        "flag-b": { variations: [{ value: "off" }] },
      },
      selectDefinition: vi.fn(async () => {
        throw new Error("select failed");
      }),
    });
    render(<Configurator store={store} />);
    await user.click(screen.getByText("flag-b"));
    expect(store.selectDefinition).toHaveBeenCalledWith("flag-b");
    // The .catch(() => {}) on selectDefinition swallows the error
    // Error banner appears because runAction is used
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("swallows removeDefinition rejection without crashing", async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      removeDefinition: vi.fn(async () => {
        throw new Error("remove failed");
      }),
    });
    render(<Configurator store={store} />);
    // The Delete button is now in the editor action bar
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);
    const confirmButton = await screen.findByRole("button", { name: "Delete" });
    await user.click(confirmButton);
    // The .catch(() => {}) swallows the rejection; component does not crash
    await waitFor(() => {
      expect(store.removeDefinition).toHaveBeenCalledWith("flag-a");
    });
  });

  it("swallows saveDefinition rejection via catch", async () => {
    const store = createMockStore({
      saveDefinition: vi.fn(async () => {
        throw new Error("save failed");
      }),
    });
    render(<Configurator store={store} />);
    const saveButton = screen.getByRole("button", { name: /^save$/i });
    await userEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("swallows discardDefinition rejection via catch", async () => {
    const store = createMockStore({
      discardDefinition: vi.fn(async () => {
        throw new Error("discard failed");
      }),
    });
    render(<Configurator store={store} />);
    const discardButton = screen.getByRole("button", { name: /discard/i });
    await userEvent.click(discardButton);
    const confirmButton = await screen.findByRole("button", { name: /^discard$/i });
    await userEvent.click(confirmButton);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("keeps rename mode open when renameDefinition rejects", async () => {
    const user = userEvent.setup();
    const store = createRejectingStore({ renameDefinition: new Error("rename failed") });
    render(<Configurator store={store} />);

    // Click the definition key button in the editor area to enter rename mode.
    // The editor shows a <button> with the key text; the sidebar shows a <span>.
    const editorKeyButton = screen.getByRole("button", { name: "Rename definition key" });
    await user.click(editorKeyButton);

    // Now an input appears with the current key value
    const input = screen.getByDisplayValue("feature-a");
    await user.clear(input);
    await user.type(input, "feature-renamed");
    fireEvent.blur(screen.getByDisplayValue("feature-renamed"));

    expect(await screen.findByText(/rename failed/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("feature-renamed")).toBeInTheDocument();
  });
});

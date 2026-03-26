import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import {
  StoreSourceContext,
  useConfiguratorStore,
  useActionState,
  useStoreRef,
  useActionRunner,
} from "./context.js";
import type { ConfiguratorStore, ConfiguratorStoreSource } from "./types.js";
import type { Definition } from "showwhat";

const baseDef: Definition = { variations: [{ value: "on" }] };

function createStore(): ConfiguratorStore {
  return {
    definitions: { "flag-a": baseDef },
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
  };
}

function createSource(store: ConfiguratorStore): ConfiguratorStoreSource {
  return {
    getSnapshot: () => store,
    subscribe: () => () => {},
  };
}

describe("useConfiguratorStore", () => {
  it("throws when used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useConfiguratorStore());
    }).toThrow(/useConfiguratorStore must be used within/);
    consoleSpy.mockRestore();
  });

  it("returns the store when used within provider", () => {
    const store = createStore();
    const source = createSource(store);
    const { result } = renderHook(() => useConfiguratorStore(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <StoreSourceContext.Provider value={source}>{children}</StoreSourceContext.Provider>
      ),
    });
    expect(result.current.selectedKey).toBe("flag-a");
  });
});

describe("useActionState", () => {
  it("throws when used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useActionState());
    }).toThrow(/useActionState must be used within/);
    consoleSpy.mockRestore();
  });
});

describe("useStoreRef", () => {
  it("returns a getter that provides the current store snapshot", () => {
    const store = createStore();
    const source = createSource(store);
    const { result } = renderHook(() => useStoreRef(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <StoreSourceContext.Provider value={source}>{children}</StoreSourceContext.Provider>
      ),
    });
    const getter = result.current;
    expect(getter().selectedKey).toBe("flag-a");
  });
});

describe("useActionRunner", () => {
  it("initializes with pending=false and error=null", () => {
    const { result } = renderHook(() => useActionRunner());
    expect(result.current.actionState.pending).toBe(false);
    expect(result.current.actionState.error).toBeNull();
  });

  it("resets pending=false after successful action", async () => {
    const { result } = renderHook(() => useActionRunner());

    await act(async () => {
      await result.current.runAction(async () => {
        // action succeeds
      });
    });

    expect(result.current.actionState.pending).toBe(false);
    expect(result.current.actionState.error).toBeNull();
  });

  it("sets error when action rejects", async () => {
    const { result } = renderHook(() => useActionRunner());

    await act(async () => {
      try {
        await result.current.runAction(async () => {
          throw new Error("test error");
        });
      } catch {
        // expected
      }
    });

    expect(result.current.actionState.error?.message).toBe("test error");
    expect(result.current.actionState.pending).toBe(false);
  });

  it("wraps non-Error throwable in Error", async () => {
    const { result } = renderHook(() => useActionRunner());

    await act(async () => {
      try {
        await result.current.runAction(async () => {
          throw "string error";
        });
      } catch {
        // expected
      }
    });

    expect(result.current.actionState.error?.message).toBe("string error");
  });

  it("clearError resets error to null", async () => {
    const { result } = renderHook(() => useActionRunner());

    await act(async () => {
      try {
        await result.current.runAction(async () => {
          throw new Error("fail");
        });
      } catch {
        // expected
      }
    });

    expect(result.current.actionState.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.actionState.error).toBeNull();
  });
});

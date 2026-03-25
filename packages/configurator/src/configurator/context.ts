import { createContext, useCallback, useContext, useSyncExternalStore, useState } from "react";
import type { ActionState, ConfiguratorStore, ConfiguratorStoreSource } from "./types.js";

export interface ActionStateContextValue {
  actionState: ActionState;
  runAction: (action: () => Promise<void>) => Promise<void>;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

/** Carries only the store source — changes rarely (only when the store identity changes). */
export const StoreSourceContext = createContext<ConfiguratorStoreSource | null>(null);

/** Carries action state (pending / error) — changes on every async action lifecycle event. */
export const ActionStateContext = createContext<ActionStateContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useStoreSource(): ConfiguratorStoreSource {
  const source = useContext(StoreSourceContext);
  if (source) return source;
  throw new Error("useConfiguratorStore must be used within a <Configurator> component");
}

export function useConfiguratorStore(): ConfiguratorStore {
  const source = useStoreSource();
  return useSyncExternalStore(source.subscribe, source.getSnapshot);
}

export function useActionState(): ActionStateContextValue {
  const ctx = useContext(ActionStateContext);
  if (ctx) return ctx;
  throw new Error("useActionState must be used within a <Configurator> component");
}

/**
 * Returns a stable getter for the current store snapshot.
 * Use this to call store methods in event handlers without
 * subscribing the component to store changes.
 */
export function useStoreRef(): () => ConfiguratorStore {
  const source = useStoreSource();
  return useCallback(() => source.getSnapshot(), [source]);
}

/** Hook that wraps async store actions with pending/error tracking. */
export function useActionRunner(): ActionStateContextValue {
  const [state, setState] = useState<ActionState>({ pending: false, error: null });

  const run = useCallback(async (action: () => Promise<void>) => {
    setState({ pending: true, error: null });
    try {
      await action();
      setState({ pending: false, error: null });
    } catch (err) {
      setState({ pending: false, error: err instanceof Error ? err : new Error(String(err)) });
      throw err; // Re-throw so callers that await can react to the failure
    }
  }, []);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return {
    actionState: state,
    runAction: run,
    clearError,
  };
}

import { useContext, useCallback, useSyncExternalStore } from "react";
import type { ConfiguratorStore } from "./types.js";
import { StoreSourceContext } from "./context.js";

/**
 * Select a slice of the ConfiguratorStore with subscription-level
 * short-circuiting.  The component only rerenders when the selected
 * value changes (via `Object.is` equality).
 *
 * Reads only from StoreSourceContext so action-state changes
 * (pending / error) do NOT trigger rerenders in selector consumers.
 */
export function useConfiguratorSelector<T>(selector: (store: ConfiguratorStore) => T): T {
  const source = useContext(StoreSourceContext);

  if (!source) {
    throw new Error("useConfiguratorSelector must be used within a <Configurator> component");
  }

  const getSnapshot = useCallback(() => selector(source.getSnapshot()), [source, selector]);

  return useSyncExternalStore(source.subscribe, getSnapshot);
}

import type { Definition, Definitions } from "@showwhat/core/schemas";

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
}

/** Tracks whether an async store action is in flight or has failed. */
export interface ActionState {
  pending: boolean;
  error: Error | null;
}

/** External-store source shape for subscription-backed selectors. */
export interface ConfiguratorStoreSource {
  getSnapshot: () => ConfiguratorStore;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Store contract any shell must implement.
 * All commands are async to support API-backed implementations.
 */
export interface ConfiguratorStore {
  // Read-only reactive state
  definitions: Definitions;
  selectedKey: string | null;
  dirtyKeys: string[];
  revision: number;
  validationErrors: Record<string, ValidationIssue[]>;

  // Queries
  isKeyDirty(key: string): boolean;

  // Commands (all async)
  selectDefinition(key: string | null): Promise<void>;
  addDefinition(key: string): Promise<void>;
  removeDefinition(key: string): Promise<void>;
  renameDefinition(oldKey: string, newKey: string): Promise<void>;
  updateDefinition(key: string, def: Definition): Promise<void>;
  saveDefinition(key: string): Promise<void>;
  discardDefinition(key: string): Promise<void>;
}

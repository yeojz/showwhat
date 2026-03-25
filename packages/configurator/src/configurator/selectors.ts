import type { ConfiguratorStore } from "./types.js";

/* Stable selectors – defined once to avoid re-creation across components. */
export const selectDefinitions = (s: ConfiguratorStore) => s.definitions;
export const selectSelectedKey = (s: ConfiguratorStore) => s.selectedKey;
export const selectValidationErrors = (s: ConfiguratorStore) => s.validationErrors;
export const selectDirtyKeys = (s: ConfiguratorStore) => s.dirtyKeys;
export const selectRevision = (s: ConfiguratorStore) => s.revision;

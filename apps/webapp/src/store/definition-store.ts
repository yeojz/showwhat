import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import { DefinitionsSchema } from "@showwhat/core/schemas";
import type { Definition, Definitions } from "@showwhat/core/schemas";
import type { Presets } from "@showwhat/core";
import type { ConfiguratorStore, ValidationIssue } from "@showwhat/configurator";

/** Remove a key from an object, returning a new object. */
function omitKey<T extends Record<string, unknown>, K extends string>(obj: T, key: K): Omit<T, K> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key)) as Omit<T, K>;
}

/** Pick the next selected key when the current one is removed. */
function getNextSelectedKey(
  currentKey: string | null,
  removedKey: string,
  remainingKeys: string[],
): string | null {
  if (currentKey !== removedKey) return currentKey;
  return remainingKeys[0] ?? null;
}

function validateDefinition(key: string, def: Definition): ValidationIssue[] {
  const result = DefinitionsSchema.safeParse({ [key]: def });
  if (result.success) return [];

  return result.error.issues.map((issue) => ({
    path: issue.path.slice(1) as (string | number)[],
    message: issue.message,
  }));
}

export type FileDefinitionState = ConfiguratorStore & {
  savedDefinitions: Definitions;
  inlinePresets: Presets;
  sourceFileName: string | null;
  sourceFormat: "yaml" | "json" | null;

  importDefinitions(
    defs: Definitions,
    fileName: string,
    format: "yaml" | "json",
    inlinePresets?: Presets,
  ): void;
  revertAll(): void;
  clearAll(): void;
};

export type CreateDefinitionStoreOptions = {
  /** Custom storage backend. Defaults to localStorage via createJSONStorage. */
  storage?: StateStorage;
};

export function createDefinitionStore(options: CreateDefinitionStoreOptions = {}) {
  const storage = createJSONStorage(() => options.storage ?? localStorage);

  return create<FileDefinitionState>()(
    persist(
      (set, get) => ({
        definitions: {},
        savedDefinitions: {},
        inlinePresets: {},
        selectedKey: null,
        sourceFileName: null,
        sourceFormat: null,
        dirtyKeys: [],
        revision: 0,
        validationErrors: {},

        isKeyDirty(key) {
          return get().dirtyKeys.includes(key);
        },

        importDefinitions(defs, fileName, format, inlinePresets) {
          set((state) => ({
            definitions: structuredClone(defs),
            savedDefinitions: structuredClone(defs),
            inlinePresets: inlinePresets ?? {},
            sourceFileName: fileName,
            sourceFormat: format,
            dirtyKeys: [],
            revision: state.revision + 1,
            validationErrors: {},
            selectedKey: Object.keys(defs)[0] ?? null,
          }));
        },

        async selectDefinition(key) {
          set({ selectedKey: key });
        },

        async addDefinition(key) {
          const newDef: Definition = { variations: [{ value: "" }] };
          set((state) => ({
            definitions: { ...state.definitions, [key]: newDef },
            dirtyKeys: state.dirtyKeys.includes(key) ? state.dirtyKeys : [...state.dirtyKeys, key],
            selectedKey: key,
          }));
        },

        async removeDefinition(key) {
          set((state) => {
            const restDefs = omitKey(state.definitions, key);
            const restSaved = omitKey(state.savedDefinitions, key);
            const restErrors = omitKey(state.validationErrors, key);
            const keys = Object.keys(restDefs);
            return {
              definitions: restDefs,
              savedDefinitions: restSaved,
              dirtyKeys: state.dirtyKeys.filter((k) => k !== key),
              validationErrors: restErrors,
              selectedKey: getNextSelectedKey(state.selectedKey, key, keys),
            };
          });
        },

        async renameDefinition(oldKey, newKey) {
          if (oldKey === newKey) return;
          const state = get();
          if (newKey in state.definitions) {
            throw new Error("A definition with that key already exists");
          }

          set((state) => {
            function renameInMap(map: Definitions): Definitions {
              const entries = Object.entries(map).map(([k, v]) =>
                k === oldKey ? [newKey, v] : [k, v],
              );
              return Object.fromEntries(entries) as Definitions;
            }

            const dirtyKeys = state.dirtyKeys.map((k) => (k === oldKey ? newKey : k));
            const validationErrors = { ...state.validationErrors };
            if (oldKey in validationErrors) {
              validationErrors[newKey] = validationErrors[oldKey];
              delete validationErrors[oldKey];
            }

            return {
              definitions: renameInMap(state.definitions),
              savedDefinitions: renameInMap(state.savedDefinitions),
              dirtyKeys,
              validationErrors,
              selectedKey: state.selectedKey === oldKey ? newKey : state.selectedKey,
            };
          });
        },

        async updateDefinition(key, def) {
          set((state) => ({
            definitions: { ...state.definitions, [key]: def },
            dirtyKeys: state.dirtyKeys.includes(key) ? state.dirtyKeys : [...state.dirtyKeys, key],
          }));
        },

        async saveDefinition(key) {
          const state = get();
          const def = state.definitions[key];
          if (!def) return;

          const errors = validateDefinition(key, def);
          if (errors.length > 0) {
            set((state) => ({
              validationErrors: { ...state.validationErrors, [key]: errors },
            }));
            return;
          }

          set((state) => {
            const restErrors = omitKey(state.validationErrors, key);
            return {
              savedDefinitions: { ...state.savedDefinitions, [key]: structuredClone(def) },
              dirtyKeys: state.dirtyKeys.filter((k) => k !== key),
              validationErrors: restErrors,
            };
          });
        },

        async discardDefinition(key) {
          set((state) => {
            const saved = state.savedDefinitions[key];
            const restErrors = omitKey(state.validationErrors, key);
            if (!saved) {
              // Unsaved addition — remove entirely
              const restDefs = omitKey(state.definitions, key);
              const keys = Object.keys(restDefs);
              return {
                definitions: restDefs,
                dirtyKeys: state.dirtyKeys.filter((k) => k !== key),
                validationErrors: restErrors,
                selectedKey: getNextSelectedKey(state.selectedKey, key, keys),
                revision: state.revision + 1,
              };
            }
            return {
              definitions: { ...state.definitions, [key]: structuredClone(saved) },
              dirtyKeys: state.dirtyKeys.filter((k) => k !== key),
              validationErrors: restErrors,
              revision: state.revision + 1,
            };
          });
        },

        revertAll() {
          set((state) => {
            const restoredDefs = structuredClone(state.savedDefinitions);
            const keys = Object.keys(restoredDefs);
            return {
              definitions: restoredDefs,
              dirtyKeys: [],
              validationErrors: {},
              revision: state.revision + 1,
              selectedKey:
                state.selectedKey && state.selectedKey in restoredDefs
                  ? state.selectedKey
                  : (keys[0] ?? null),
            };
          });
        },

        clearAll() {
          set((state) => ({
            definitions: {},
            savedDefinitions: {},
            inlinePresets: {},
            selectedKey: null,
            sourceFileName: null,
            sourceFormat: null,
            dirtyKeys: [],
            revision: state.revision + 1,
            validationErrors: {},
          }));
        },
      }),
      {
        name: "showwhat-configurator",
        version: 1,
        storage,
        partialize: (state) => ({
          savedDefinitions: state.savedDefinitions,
          inlinePresets: state.inlinePresets,
          selectedKey: state.selectedKey,
          sourceFileName: state.sourceFileName,
          sourceFormat: state.sourceFormat,
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          state.definitions = structuredClone(state.savedDefinitions);
          state.inlinePresets = state.inlinePresets ?? {};
          state.dirtyKeys = [];
          state.validationErrors = {};
        },
      },
    ),
  );
}

/** Singleton store backed by browser localStorage — use in production code. */
export const useDefinitionStore = createDefinitionStore();

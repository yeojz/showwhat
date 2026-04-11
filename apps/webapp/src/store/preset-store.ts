import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import { PresetsSchema } from "showwhat";
import { STORE_VERSION } from "./constants.js";
import type { Presets } from "showwhat";
import yaml from "js-yaml";

type PresetStoreState = {
  /** User-defined preset overrides (highest priority). */
  presets: Presets;
  presetYaml: string;
  parseError: string | null;
  setPresetYaml: (yaml: string) => void;
  setPresets: (presets: Presets) => void;

  /** Cached shared presets from the active source (presetsUrl or file). */
  sourcePresets: Presets;
  /** Per-key file presets from lazy-loaded split definitions. */
  keyFilePresets: Record<string, Presets>;
  /** When sourcePresets were last fetched from the network. */
  sourcePresetsLastFetched?: number;
  /** Replace cached source presets and update the timestamp. */
  setSourcePresets: (presets: Presets) => void;
  /** Store file presets from a lazy-loaded split definition key. */
  upsertKeyFilePresets: (key: string, presets: Presets) => void;
  /** Clear all source preset caches (e.g., when switching sources). */
  clearSourcePresets: () => void;
};

function parseAndValidate(
  text: string,
): { presets: Presets; error: null } | { presets: null; error: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { presets: {}, error: null };
  }

  let raw: unknown;
  try {
    raw = yaml.load(trimmed);
  } catch {
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return { presets: null, error: "Invalid YAML or JSON" };
    }
  }

  const result = PresetsSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues.map((i) => `[${i.path.join(".")}] ${i.message}`);
    return { presets: null, error: messages.join("; ") };
  }

  return { presets: result.data, error: null };
}

export type CreatePresetStoreOptions = {
  storage?: StateStorage;
};

export function createPresetStore(options: CreatePresetStoreOptions = {}) {
  const storage = createJSONStorage(() => options.storage ?? localStorage);

  return create<PresetStoreState>()(
    persist(
      (set) => ({
        presets: {},
        presetYaml: "",
        parseError: null,

        sourcePresets: {},
        keyFilePresets: {},
        sourcePresetsLastFetched: undefined,

        setPresetYaml(yaml: string) {
          const { presets, error } = parseAndValidate(yaml);
          if (error) {
            set({ presetYaml: yaml, parseError: error });
          } else {
            set({ presetYaml: yaml, presets: presets!, parseError: null });
          }
        },

        setPresets(presets: Presets) {
          set({ presets, presetYaml: "", parseError: null });
        },

        setSourcePresets(presets: Presets) {
          set({ sourcePresets: presets, sourcePresetsLastFetched: Date.now() });
        },

        upsertKeyFilePresets(key: string, presets: Presets) {
          set((state) => ({
            keyFilePresets: { ...state.keyFilePresets, [key]: presets },
          }));
        },

        clearSourcePresets() {
          set({
            sourcePresets: {},
            keyFilePresets: {},
            sourcePresetsLastFetched: undefined,
          });
        },
      }),
      {
        name: "showwhat-presets",
        version: STORE_VERSION,
        storage,
        partialize: (state) => ({
          presetYaml: state.presetYaml,
          presets: state.presets,
          sourcePresets: state.sourcePresets,
          keyFilePresets: state.keyFilePresets,
          sourcePresetsLastFetched: state.sourcePresetsLastFetched,
        }),
        migrate(persistedState) {
          return persistedState;
        },
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          state.sourcePresets = state.sourcePresets ?? {};
          state.keyFilePresets = state.keyFilePresets ?? {};
        },
      },
    ),
  );
}

export const usePresetStore = createPresetStore();

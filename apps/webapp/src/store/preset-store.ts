import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import { PresetsSchema } from "showwhat";
import type { Presets } from "showwhat";
import yaml from "js-yaml";

type PresetStoreState = {
  presets: Presets;
  presetYaml: string;
  parseError: string | null;
  setPresetYaml: (yaml: string) => void;
  setPresets: (presets: Presets) => void;
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
      }),
      {
        name: "showwhat-presets",
        version: 1,
        storage,
        partialize: (state) => ({
          presetYaml: state.presetYaml,
          presets: state.presets,
        }),
      },
    ),
  );
}

export const usePresetStore = createPresetStore();

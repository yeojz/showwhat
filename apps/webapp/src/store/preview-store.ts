import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import type { PreviewState } from "@showwhat/configurator";
import { STORE_VERSION } from "./constants.js";

export type CreatePreviewStoreOptions = {
  storage?: StateStorage;
};

export function createPreviewStore(options: CreatePreviewStoreOptions = {}) {
  const storage = createJSONStorage(() => options.storage ?? localStorage);

  return create<PreviewState>()(
    persist(
      (set) => ({
        contextText: "",
        annotationsText: "",
        evaluatorText: "",

        setContextText(text: string) {
          set({ contextText: text });
        },

        setAnnotationsText(text: string) {
          set({ annotationsText: text });
        },

        setEvaluatorText(text: string) {
          set({ evaluatorText: text });
        },

        resetPreview() {
          set({ contextText: "", annotationsText: "", evaluatorText: "" });
        },
      }),
      {
        name: "showwhat-preview",
        version: STORE_VERSION,
        storage,
        partialize: (state) => ({
          contextText: state.contextText,
          annotationsText: state.annotationsText,
          evaluatorText: state.evaluatorText,
        }),
      },
    ),
  );
}

/** Singleton store backed by browser localStorage — use in production code. */
export const usePreviewStore = createPreviewStore();

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";

export type SourceFormat = "yaml" | "json";

type BaseSource = {
  id: string;
  label: string;
  format: SourceFormat;
  headers?: Record<string, string>;
};

export type SingleSource = BaseSource & {
  mode: "single";
  url: string;
  lastFetched?: number;
};

export type KeyedSource = BaseSource & {
  mode: "keyed";
  baseUrl: string;
  listUrl?: string;
  presetsUrl?: string;
  definitionKeys: string[];
  keyFetchedAt?: Record<string, number>;
  listLastFetched?: number;
  presetsLastFetched?: number;
};

export type RemoteSource = SingleSource | KeyedSource;

export type SourceStoreState = {
  sources: RemoteSource[];
  activeSourceId: string | null;

  addSource(source: Omit<RemoteSource, "id">): string;
  updateSource(id: string, updates: Partial<Omit<RemoteSource, "id">>): void;
  removeSource(id: string): void;
  setActiveSource(id: string | null): void;
  markFetched(id: string, keys?: string[]): void;
  markListFetched(id: string): void;
  markPresetsFetched(id: string): void;
  setDefinitionKeys(id: string, keys: string[]): void;
  addDefinitionKey(id: string, key: string): void;
  removeDefinitionKey(id: string, key: string): void;
};

export type CreateSourceStoreOptions = {
  storage?: StateStorage;
};

export function createSourceStore(options: CreateSourceStoreOptions = {}) {
  const storage = createJSONStorage(() => options.storage ?? localStorage);

  return create<SourceStoreState>()(
    persist(
      (set) => ({
        sources: [],
        activeSourceId: null,

        addSource(source) {
          const id = crypto.randomUUID();
          // Cast needed: TS can't re-narrow Omit<Union, "id"> & {id} back to Union
          const newSource: RemoteSource = { ...source, id } as unknown as RemoteSource;
          set((state) => ({
            sources: [...state.sources, newSource],
          }));
          return id;
        },

        updateSource(id, updates) {
          set((state) => ({
            sources: state.sources.map((s) =>
              s.id === id ? (Object.assign({}, s, updates) as RemoteSource) : s,
            ),
          }));
        },

        removeSource(id) {
          set((state) => ({
            sources: state.sources.filter((s) => s.id !== id),
            activeSourceId: state.activeSourceId === id ? null : state.activeSourceId,
          }));
        },

        setActiveSource(id) {
          set({ activeSourceId: id });
        },

        markFetched(id, keys) {
          set((state) => ({
            sources: state.sources.map((s) => {
              if (s.id !== id) return s;
              if (s.mode === "single") {
                return { ...s, lastFetched: Date.now() };
              }
              if (s.mode === "keyed" && keys) {
                const now = Date.now();
                const updated: Record<string, number> = { ...s.keyFetchedAt };
                for (const key of keys) {
                  updated[key] = now;
                }
                return { ...s, keyFetchedAt: updated };
              }
              return s;
            }),
          }));
        },

        markListFetched(id) {
          set((state) => ({
            sources: state.sources.map((s) => {
              if (s.id !== id || s.mode !== "keyed") return s;
              return { ...s, listLastFetched: Date.now() };
            }),
          }));
        },

        markPresetsFetched(id) {
          set((state) => ({
            sources: state.sources.map((s) => {
              if (s.id !== id || s.mode !== "keyed") return s;
              return { ...s, presetsLastFetched: Date.now() };
            }),
          }));
        },

        setDefinitionKeys(id, keys) {
          set((state) => ({
            sources: state.sources.map((s) => {
              if (s.id !== id || s.mode !== "keyed") return s;
              return { ...s, definitionKeys: keys };
            }),
          }));
        },

        addDefinitionKey(id, key) {
          set((state) => ({
            sources: state.sources.map((s) => {
              if (s.id !== id || s.mode !== "keyed") return s;
              if (s.definitionKeys.includes(key)) return s;
              return { ...s, definitionKeys: [...s.definitionKeys, key] };
            }),
          }));
        },

        removeDefinitionKey(id, key) {
          set((state) => ({
            sources: state.sources.map((s) => {
              if (s.id !== id || s.mode !== "keyed") return s;
              return { ...s, definitionKeys: s.definitionKeys.filter((k) => k !== key) };
            }),
          }));
        },
      }),
      {
        name: "showwhat-sources",
        version: 1,
        storage,
        partialize: (state) => ({
          sources: state.sources,
          activeSourceId: state.activeSourceId,
        }),
      },
    ),
  );
}

export const useSourceStore = createSourceStore();

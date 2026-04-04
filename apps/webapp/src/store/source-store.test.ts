import { describe, it, expect, beforeEach } from "vitest";
import { createSourceStore } from "./source-store.js";
import { createTestStorage } from "./test-storage.js";
import type { SourceStoreState, RemoteSource } from "./source-store.js";

const sampleSingleSource: Omit<RemoteSource, "id"> = {
  mode: "single",
  label: "Production",
  format: "yaml",
  url: "https://r2.example.com/flags.yaml",
};

const sampleKeyedSource: Omit<RemoteSource, "id"> = {
  mode: "keyed",
  label: "Staging",
  format: "json",
  listUrl: "https://r2.example.com/keys.json",
  baseUrl: "https://r2.example.com/defs/",
  definitionKeys: [],
};

let store: ReturnType<typeof createSourceStore>;

function getState(): SourceStoreState {
  return store.getState();
}

describe("source-store", () => {
  beforeEach(() => {
    store = createSourceStore({ storage: createTestStorage() });
  });

  describe("addSource", () => {
    it("adds a single source with a generated id", () => {
      const id = getState().addSource(sampleSingleSource);
      expect(id).toBeTruthy();
      expect(getState().sources).toHaveLength(1);
      expect(getState().sources[0].id).toBe(id);
      expect(getState().sources[0].label).toBe("Production");
      expect(getState().sources[0].mode).toBe("single");
    });

    it("adds a keyed source", () => {
      const id = getState().addSource(sampleKeyedSource);
      const source = getState().sources.find((s) => s.id === id);
      expect(source).toBeDefined();
      expect(source!.mode).toBe("keyed");
      if (source!.mode === "keyed") {
        expect(source!.listUrl).toBe("https://r2.example.com/keys.json");
        expect(source!.baseUrl).toBe("https://r2.example.com/defs/");
        expect(source!.definitionKeys).toEqual([]);
      }
    });

    it("adds multiple sources", () => {
      getState().addSource(sampleSingleSource);
      getState().addSource(sampleKeyedSource);
      expect(getState().sources).toHaveLength(2);
    });
  });

  describe("updateSource", () => {
    it("updates a source's label", () => {
      const id = getState().addSource(sampleSingleSource);
      getState().updateSource(id, { label: "Updated" });
      expect(getState().sources[0].label).toBe("Updated");
    });

    it("does not affect other sources", () => {
      const id1 = getState().addSource(sampleSingleSource);
      const id2 = getState().addSource(sampleKeyedSource);
      getState().updateSource(id1, { label: "Changed" });
      expect(getState().sources.find((s) => s.id === id2)!.label).toBe("Staging");
    });
  });

  describe("removeSource", () => {
    it("removes a source", () => {
      const id = getState().addSource(sampleSingleSource);
      getState().removeSource(id);
      expect(getState().sources).toHaveLength(0);
    });

    it("clears activeSourceId if the removed source was active", () => {
      const id = getState().addSource(sampleSingleSource);
      getState().setActiveSource(id);
      expect(getState().activeSourceId).toBe(id);
      getState().removeSource(id);
      expect(getState().activeSourceId).toBeNull();
    });

    it("preserves activeSourceId if a different source was removed", () => {
      const id1 = getState().addSource(sampleSingleSource);
      const id2 = getState().addSource(sampleKeyedSource);
      getState().setActiveSource(id1);
      getState().removeSource(id2);
      expect(getState().activeSourceId).toBe(id1);
    });
  });

  describe("setActiveSource", () => {
    it("sets the active source id", () => {
      const id = getState().addSource(sampleSingleSource);
      getState().setActiveSource(id);
      expect(getState().activeSourceId).toBe(id);
    });

    it("clears the active source", () => {
      const id = getState().addSource(sampleSingleSource);
      getState().setActiveSource(id);
      getState().setActiveSource(null);
      expect(getState().activeSourceId).toBeNull();
    });
  });

  describe("markFetched", () => {
    it("sets lastFetched on a single source", () => {
      const id = getState().addSource(sampleSingleSource);
      const before = Date.now();
      getState().markFetched(id);
      const source = getState().sources[0];
      expect(source.mode).toBe("single");
      if (source.mode === "single") {
        expect(source.lastFetched).toBeGreaterThanOrEqual(before);
        expect(source.lastFetched).toBeLessThanOrEqual(Date.now());
      }
    });

    it("sets keyFetchedAt on a keyed source", () => {
      const id = getState().addSource(sampleKeyedSource);
      const before = Date.now();
      getState().markFetched(id, ["flag-a", "flag-b"]);
      const source = getState().sources[0];
      expect(source.mode).toBe("keyed");
      if (source.mode === "keyed") {
        expect(source.keyFetchedAt).toBeDefined();
        expect(source.keyFetchedAt!["flag-a"]).toBeGreaterThanOrEqual(before);
        expect(source.keyFetchedAt!["flag-b"]).toBeGreaterThanOrEqual(before);
      }
    });

    it("preserves existing keyFetchedAt entries", () => {
      const id = getState().addSource(sampleKeyedSource);
      getState().markFetched(id, ["flag-a"]);
      const firstFetch = (getState().sources[0] as { keyFetchedAt?: Record<string, number> })
        .keyFetchedAt!["flag-a"];
      getState().markFetched(id, ["flag-b"]);
      const source = getState().sources[0];
      if (source.mode === "keyed") {
        expect(source.keyFetchedAt!["flag-a"]).toBe(firstFetch);
        expect(source.keyFetchedAt!["flag-b"]).toBeDefined();
      }
    });
  });

  describe("markFetched edge cases", () => {
    it("does not modify a keyed source when no keys are provided", () => {
      const id = getState().addSource(sampleKeyedSource);
      getState().markFetched(id);
      const source = getState().sources[0];
      if (source.mode === "keyed") {
        expect(source.keyFetchedAt).toBeUndefined();
      }
    });

    it("does not modify unrelated sources", () => {
      const id1 = getState().addSource(sampleSingleSource);
      const id2 = getState().addSource(sampleKeyedSource);
      getState().markFetched(id1);
      const source2 = getState().sources.find((s) => s.id === id2);
      if (source2!.mode === "keyed") {
        expect(source2!.keyFetchedAt).toBeUndefined();
      }
    });
  });

  describe("setDefinitionKeys", () => {
    it("replaces the entire key list on a keyed source", () => {
      const id = getState().addSource(sampleKeyedSource);
      getState().setDefinitionKeys(id, ["flag-a", "flag-b"]);
      const source = getState().sources.find((s) => s.id === id);
      expect(source!.mode).toBe("keyed");
      if (source!.mode === "keyed") {
        expect(source!.definitionKeys).toEqual(["flag-a", "flag-b"]);
      }
    });

    it("overwrites previously set keys", () => {
      const id = getState().addSource(sampleKeyedSource);
      getState().setDefinitionKeys(id, ["flag-a", "flag-b"]);
      getState().setDefinitionKeys(id, ["flag-c"]);
      const source = getState().sources.find((s) => s.id === id);
      if (source!.mode === "keyed") {
        expect(source!.definitionKeys).toEqual(["flag-c"]);
      }
    });
  });

  describe("addDefinitionKey", () => {
    it("adds a key to an empty list", () => {
      const id = getState().addSource(sampleKeyedSource);
      getState().addDefinitionKey(id, "flag-a");
      const source = getState().sources.find((s) => s.id === id);
      if (source!.mode === "keyed") {
        expect(source!.definitionKeys).toEqual(["flag-a"]);
      }
    });

    it("appends a key to an existing list", () => {
      const id = getState().addSource(sampleKeyedSource);
      getState().addDefinitionKey(id, "flag-a");
      getState().addDefinitionKey(id, "flag-b");
      const source = getState().sources.find((s) => s.id === id);
      if (source!.mode === "keyed") {
        expect(source!.definitionKeys).toEqual(["flag-a", "flag-b"]);
      }
    });

    it("does not add duplicate keys", () => {
      const id = getState().addSource(sampleKeyedSource);
      getState().addDefinitionKey(id, "flag-a");
      getState().addDefinitionKey(id, "flag-a");
      const source = getState().sources.find((s) => s.id === id);
      if (source!.mode === "keyed") {
        expect(source!.definitionKeys).toEqual(["flag-a"]);
      }
    });
  });

  describe("removeDefinitionKey", () => {
    it("removes an existing key", () => {
      const id = getState().addSource(sampleKeyedSource);
      getState().setDefinitionKeys(id, ["flag-a", "flag-b", "flag-c"]);
      getState().removeDefinitionKey(id, "flag-b");
      const source = getState().sources.find((s) => s.id === id);
      if (source!.mode === "keyed") {
        expect(source!.definitionKeys).toEqual(["flag-a", "flag-c"]);
      }
    });

    it("does nothing when the key is not present", () => {
      const id = getState().addSource(sampleKeyedSource);
      getState().setDefinitionKeys(id, ["flag-a"]);
      getState().removeDefinitionKey(id, "flag-z");
      const source = getState().sources.find((s) => s.id === id);
      if (source!.mode === "keyed") {
        expect(source!.definitionKeys).toEqual(["flag-a"]);
      }
    });
  });

  describe("persistence", () => {
    it("rehydrates sources from storage", async () => {
      const storage = createTestStorage();
      const store1 = createSourceStore({ storage });
      const id = store1.getState().addSource(sampleSingleSource);
      store1.getState().setActiveSource(id);

      // Create a new store with the same storage
      const store2 = createSourceStore({ storage });
      // Zustand persist rehydration is sync with custom storage
      await new Promise((r) => setTimeout(r, 10));
      expect(store2.getState().sources).toHaveLength(1);
      expect(store2.getState().activeSourceId).toBe(id);
    });
  });
});

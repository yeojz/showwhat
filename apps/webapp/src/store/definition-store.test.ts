import { describe, it, expect, beforeEach } from "vitest";
import { createDefinitionStore } from "./definition-store.js";
import { createTestStorage } from "./test-storage.js";
import type { StateStorage } from "zustand/middleware";
import type { Definitions, Definition } from "showwhat";
import type { Presets } from "showwhat";
import type { FileDefinitionState } from "./definition-store.js";

const sampleDefinitions: Definitions = {
  "feature-a": {
    description: "Test definition A",
    variations: [
      { value: true, conditions: [{ type: "env", op: "eq", value: "production" }] },
      { value: false },
    ],
  },
  "feature-b": {
    variations: [{ value: "hello" }],
  },
};

const samplePresets: Presets = {
  tier: { type: "string", key: "tier" },
};

let store: ReturnType<typeof createDefinitionStore>;

function getState(): FileDefinitionState {
  return store.getState();
}

describe("definition-store", () => {
  beforeEach(() => {
    store = createDefinitionStore({ storage: createTestStorage() });
  });

  it("does not depend on browser localStorage shape in tests", () => {
    const isolated = createDefinitionStore({ storage: createTestStorage() });
    expect(() => isolated.getState().clearAll()).not.toThrow();
  });

  describe("importDefinitions", () => {
    it("should import definitions and set metadata", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      const state = getState();
      expect(state.definitions).toEqual(sampleDefinitions);
      expect(state.savedDefinitions).toEqual(sampleDefinitions);
      expect(state.sourceFileName).toBe("test.yaml");
      expect(state.sourceFormat).toBe("yaml");
      expect(state.dirtyKeys).toEqual([]);
      expect(state.selectedKey).toBe("feature-a");
    });

    it("should select the first definition key", () => {
      getState().importDefinitions(sampleDefinitions, "test.json", "json");
      expect(getState().selectedKey).toBe("feature-a");
    });

    it("should clear validation errors", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      expect(Object.keys(getState().validationErrors)).toHaveLength(0);
    });

    it("selects null when importing empty definitions", () => {
      getState().importDefinitions({}, "empty.yaml", "yaml");
      expect(getState().selectedKey).toBeNull();
    });

    it("stores file presets when provided", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml", samplePresets);
      expect(getState().filePresets).toEqual(samplePresets);
    });

    it("defaults filePresets to empty object when not provided", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      expect(getState().filePresets).toEqual({});
    });

    it("clears sourcePresets on full import", () => {
      getState().setSourcePresets(samplePresets);
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      expect(getState().sourcePresets).toEqual({});
    });

    it("does not share object references between working and saved state", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      const working = getState().definitions["feature-a"];
      const saved = getState().savedDefinitions["feature-a"];
      expect(working).toEqual(saved);
      expect(working).not.toBe(saved); // Different object references
    });
  });

  describe("selectDefinition", () => {
    it("should update selectedKey", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().selectDefinition("feature-b");
      expect(getState().selectedKey).toBe("feature-b");
    });

    it("should allow selecting null", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().selectDefinition(null);
      expect(getState().selectedKey).toBeNull();
    });
  });

  describe("addDefinition", () => {
    it("should add a new definition with a default variation", async () => {
      await getState().addDefinition("new-def");
      const state = getState();
      expect(state.definitions["new-def"]).toBeDefined();
      expect(state.definitions["new-def"].variations).toHaveLength(1);
      expect(state.selectedKey).toBe("new-def");
    });

    it("marks a newly added definition as dirty until saved", async () => {
      await getState().addDefinition("new-flag");
      expect(getState().dirtyKeys).toContain("new-flag");
      expect(getState().savedDefinitions["new-flag"]).toBeUndefined();
    });

    it("does not duplicate key in dirtyKeys when adding same key again", async () => {
      await getState().addDefinition("new-flag");
      await getState().addDefinition("new-flag");
      expect(getState().dirtyKeys.filter((k) => k === "new-flag")).toHaveLength(1);
    });
  });

  describe("removeDefinition", () => {
    it("should remove a definition from both maps", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().removeDefinition("feature-a");
      expect(getState().definitions["feature-a"]).toBeUndefined();
      expect(getState().savedDefinitions["feature-a"]).toBeUndefined();
    });

    it("should select another definition if the selected one is removed", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().selectDefinition("feature-a");
      await getState().removeDefinition("feature-a");
      expect(getState().selectedKey).toBe("feature-b");
    });

    it("preserves selectedKey when a different definition is removed", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().selectDefinition("feature-a");
      await getState().removeDefinition("feature-b");
      expect(getState().selectedKey).toBe("feature-a");
    });

    it("should remove from dirtyKeys and validationErrors", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [{ value: 99 }] });
      expect(getState().dirtyKeys).toContain("feature-a");
      await getState().removeDefinition("feature-a");
      expect(getState().dirtyKeys).not.toContain("feature-a");
    });
  });

  describe("renameDefinition", () => {
    it("should rename a definition and preserve order", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().renameDefinition("feature-a", "feature-renamed");
      const state = getState();
      expect(state.definitions["feature-a"]).toBeUndefined();
      expect(state.definitions["feature-renamed"]).toBeDefined();
    });

    it("should update selectedKey when selected definition is renamed", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().selectDefinition("feature-a");
      await getState().renameDefinition("feature-a", "feature-renamed");
      expect(getState().selectedKey).toBe("feature-renamed");
    });

    it("should not rename to an existing key", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await expect(getState().renameDefinition("feature-a", "feature-b")).rejects.toThrow(
        "A definition with that key already exists",
      );
      expect(getState().definitions["feature-a"]).toBeDefined();
    });

    it("should transfer dirty state when renaming", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [{ value: 99 }] });
      expect(getState().dirtyKeys).toContain("feature-a");
      await getState().renameDefinition("feature-a", "feature-renamed");
      expect(getState().dirtyKeys).toContain("feature-renamed");
      expect(getState().dirtyKeys).not.toContain("feature-a");
    });

    it("should transfer validation errors when renaming", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      // Create a validation error by saving an invalid definition
      const invalid: Definition = { variations: [] };
      await getState().updateDefinition("feature-a", invalid);
      await getState().saveDefinition("feature-a");
      expect(getState().validationErrors["feature-a"]).toBeDefined();

      await getState().renameDefinition("feature-a", "feature-renamed");
      expect(getState().validationErrors["feature-renamed"]).toBeDefined();
      expect(getState().validationErrors["feature-a"]).toBeUndefined();
    });

    it("should be a no-op when renaming to the same key", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().renameDefinition("feature-a", "feature-a");
      expect(getState().definitions["feature-a"]).toBeDefined();
    });

    it("does not change selectedKey when renaming a non-selected definition", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().selectDefinition("feature-a");
      await getState().renameDefinition("feature-b", "feature-b-renamed");
      expect(getState().selectedKey).toBe("feature-a");
      expect(getState().definitions["feature-b-renamed"]).toBeDefined();
    });

    it("transfers dirty keys for non-renamed definitions untouched", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [{ value: 1 }] });
      await getState().updateDefinition("feature-b", { variations: [{ value: 2 }] });
      await getState().renameDefinition("feature-a", "feature-renamed");
      expect(getState().dirtyKeys).toContain("feature-renamed");
      expect(getState().dirtyKeys).toContain("feature-b");
    });
  });

  describe("updateDefinition", () => {
    it("should update a definition and add to dirtyKeys", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      const updated: Definition = {
        description: "Updated",
        variations: [{ value: 42 }],
      };
      await getState().updateDefinition("feature-a", updated);
      expect(getState().definitions["feature-a"]).toEqual(updated);
      expect(getState().dirtyKeys).toContain("feature-a");
    });

    it("should not duplicate key in dirtyKeys on multiple updates", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [{ value: 1 }] });
      await getState().updateDefinition("feature-a", { variations: [{ value: 2 }] });
      expect(getState().dirtyKeys.filter((k) => k === "feature-a")).toHaveLength(1);
    });

    it("should not validate on update", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      const invalid: Definition = { variations: [] };
      await getState().updateDefinition("feature-a", invalid);
      expect(Object.keys(getState().validationErrors)).toHaveLength(0);
    });
  });

  describe("saveDefinition", () => {
    it("should save valid definition and clear dirty/errors", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      const updated: Definition = { description: "Updated", variations: [{ value: 42 }] };
      await getState().updateDefinition("feature-a", updated);
      expect(getState().dirtyKeys).toContain("feature-a");

      await getState().saveDefinition("feature-a");
      const state = getState();
      expect(state.dirtyKeys).not.toContain("feature-a");
      expect(state.savedDefinitions["feature-a"]).toEqual(updated);
      expect(state.validationErrors["feature-a"]).toBeUndefined();
    });

    it("should block save with invalid data and populate validationErrors", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      const invalid: Definition = { variations: [] };
      await getState().updateDefinition("feature-a", invalid);
      await getState().saveDefinition("feature-a");

      const state = getState();
      expect(state.dirtyKeys).toContain("feature-a");
      expect(state.validationErrors["feature-a"]).toBeDefined();
      expect(state.validationErrors["feature-a"].length).toBeGreaterThan(0);
      // savedDefinitions should NOT be updated
      expect(state.savedDefinitions["feature-a"]).toEqual(sampleDefinitions["feature-a"]);
    });
  });

  describe("discardDefinition", () => {
    it("should revert definition to saved version", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [{ value: 99 }] });
      expect(getState().dirtyKeys).toContain("feature-a");

      await getState().discardDefinition("feature-a");
      const state = getState();
      expect(state.definitions["feature-a"]).toEqual(sampleDefinitions["feature-a"]);
      expect(state.dirtyKeys).not.toContain("feature-a");
    });

    it("removes unsaved new definitions entirely", async () => {
      await getState().addDefinition("new-flag");
      await getState().discardDefinition("new-flag");
      expect(getState().definitions["new-flag"]).toBeUndefined();
      expect(getState().selectedKey).toBeNull();
    });

    it("should clear validation errors for discarded definition", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      const invalid: Definition = { variations: [] };
      await getState().updateDefinition("feature-a", invalid);
      await getState().saveDefinition("feature-a"); // triggers validation errors
      expect(getState().validationErrors["feature-a"]).toBeDefined();

      await getState().discardDefinition("feature-a");
      expect(getState().validationErrors["feature-a"]).toBeUndefined();
    });
  });

  describe("revertAll", () => {
    it("removes unsaved new definitions", async () => {
      await getState().addDefinition("new-flag");
      getState().revertAll();
      expect(getState().definitions["new-flag"]).toBeUndefined();
    });

    it("restores dirty definitions to saved state", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [{ value: 99 }] });
      getState().revertAll();
      expect(getState().definitions["feature-a"]).toEqual(sampleDefinitions["feature-a"]);
      expect(getState().dirtyKeys).toEqual([]);
    });

    it("reselects a valid key when selected key is unsaved", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().addDefinition("new-flag");
      await getState().selectDefinition("new-flag");
      getState().revertAll();
      expect(getState().selectedKey).not.toBe("new-flag");
      expect(getState().selectedKey).toBe("feature-a");
    });
  });

  describe("mutation-safety", () => {
    it("clones on save so later working-state mutation does not corrupt savedDefinitions", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");

      await getState().saveDefinition("feature-a");
      const saved = getState().savedDefinitions["feature-a"];
      const working = getState().definitions["feature-a"];

      working.variations[0].value = "mutated";

      expect(saved.variations[0].value).not.toBe("mutated");
    });

    it("clones on discard so restored working state does not alias savedDefinitions", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [{ value: 99 }] });

      await getState().discardDefinition("feature-a");
      const saved = getState().savedDefinitions["feature-a"];
      const working = getState().definitions["feature-a"];

      working.variations[0].value = "mutated";

      expect(saved.variations[0].value).not.toBe("mutated");
    });

    it("clones on revertAll so reverted working state does not alias savedDefinitions", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [{ value: 99 }] });

      getState().revertAll();
      const saved = getState().savedDefinitions["feature-a"];
      const working = getState().definitions["feature-a"];

      working.variations[0].value = "mutated";

      expect(saved.variations[0].value).not.toBe("mutated");
    });
  });

  describe("upsertDefinition", () => {
    it("merges a single key without touching other definitions", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      const updated = { variations: [{ value: 99 }] };
      getState().upsertDefinition("feature-a", updated);
      expect(getState().definitions["feature-a"]).toEqual(updated);
      expect(getState().definitions["feature-b"]).toEqual(sampleDefinitions["feature-b"]);
    });

    it("updates savedDefinitions so the key is no longer dirty", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      getState().upsertDefinition("feature-a", { variations: [{ value: 99 }] });
      expect(getState().dirtyKeys).not.toContain("feature-a");
      expect(getState().savedDefinitions["feature-a"]).toEqual({ variations: [{ value: 99 }] });
    });

    it("clears validation errors for the upserted key", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [] });
      await getState().saveDefinition("feature-a"); // triggers validation error
      expect(getState().validationErrors["feature-a"]).toBeDefined();
      getState().upsertDefinition("feature-a", { variations: [{ value: "fixed" }] });
      expect(getState().validationErrors["feature-a"]).toBeUndefined();
    });

    it("does not touch filePresets or sourcePresets", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml", samplePresets);
      getState().setSourcePresets({ env: { type: "string", key: "env" } });
      getState().upsertDefinition("feature-a", { variations: [{ value: 1 }] });
      expect(getState().filePresets).toEqual(samplePresets);
      expect(getState().sourcePresets).toEqual({ env: { type: "string", key: "env" } });
    });

    it("clears dirty state for the upserted key only", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [{ value: 1 }] });
      await getState().updateDefinition("feature-b", { variations: [{ value: 2 }] });
      getState().upsertDefinition("feature-a", { variations: [{ value: 99 }] });
      expect(getState().dirtyKeys).not.toContain("feature-a");
      expect(getState().dirtyKeys).toContain("feature-b");
    });

    it("does not change selectedKey", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      getState().upsertDefinition("feature-b", { variations: [{ value: "x" }] });
      expect(getState().selectedKey).toBe("feature-a");
    });
  });

  describe("setSourcePresets", () => {
    it("sets source presets without touching definitions", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml", samplePresets);
      getState().setSourcePresets({ env: { type: "string", key: "env" } });
      expect(getState().sourcePresets).toEqual({ env: { type: "string", key: "env" } });
      expect(getState().definitions).toEqual(sampleDefinitions);
      expect(getState().filePresets).toEqual(samplePresets);
    });

    it("can be cleared by passing an empty object", () => {
      getState().setSourcePresets(samplePresets);
      getState().setSourcePresets({});
      expect(getState().sourcePresets).toEqual({});
    });
  });

  describe("setDefinitionPresets", () => {
    it("sets the entire definitionPresets map", () => {
      getState().setDefinitionPresets({
        "flag-a": { tier: { type: "string", key: "tier" } },
        "flag-b": { env: { type: "string", key: "env" } },
      });
      expect(getState().definitionPresets).toEqual({
        "flag-a": { tier: { type: "string", key: "tier" } },
        "flag-b": { env: { type: "string", key: "env" } },
      });
    });

    it("replaces the previous map entirely", () => {
      getState().setDefinitionPresets({ "flag-a": { tier: { type: "string", key: "tier" } } });
      getState().setDefinitionPresets({ "flag-b": { env: { type: "string", key: "env" } } });
      expect(getState().definitionPresets).toEqual({
        "flag-b": { env: { type: "string", key: "env" } },
      });
    });

    it("does not touch definitions, filePresets, or sourcePresets", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml", samplePresets);
      getState().setSourcePresets({ env: { type: "string", key: "env" } });
      getState().setDefinitionPresets({ "flag-a": { tier: { type: "string", key: "tier" } } });
      expect(getState().definitions).toEqual(sampleDefinitions);
      expect(getState().filePresets).toEqual(samplePresets);
      expect(getState().sourcePresets).toEqual({ env: { type: "string", key: "env" } });
    });
  });

  describe("upsertDefinitionPresets", () => {
    it("adds presets for a new key without removing others", () => {
      getState().setDefinitionPresets({ "flag-a": { tier: { type: "string", key: "tier" } } });
      getState().upsertDefinitionPresets("flag-b", { env: { type: "string", key: "env" } });
      expect(getState().definitionPresets).toEqual({
        "flag-a": { tier: { type: "string", key: "tier" } },
        "flag-b": { env: { type: "string", key: "env" } },
      });
    });

    it("overwrites presets for an existing key", () => {
      getState().setDefinitionPresets({ "flag-a": { tier: { type: "string", key: "old" } } });
      getState().upsertDefinitionPresets("flag-a", { tier: { type: "string", key: "new" } });
      expect(getState().definitionPresets["flag-a"]).toEqual({
        tier: { type: "string", key: "new" },
      });
    });
  });

  describe("clearAll", () => {
    it("should reset all state", () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml", samplePresets);
      getState().setSourcePresets({ env: { type: "string", key: "env" } });
      getState().setDefinitionPresets({ "flag-a": { tier: { type: "string", key: "tier" } } });
      getState().clearAll();
      const state = getState();
      expect(state.definitions).toEqual({});
      expect(state.savedDefinitions).toEqual({});
      expect(state.filePresets).toEqual({});
      expect(state.sourcePresets).toEqual({});
      expect(state.definitionPresets).toEqual({});
      expect(state.selectedKey).toBeNull();
      expect(state.sourceFileName).toBeNull();
      expect(state.sourceFormat).toBeNull();
      expect(state.dirtyKeys).toEqual([]);
      expect(state.validationErrors).toEqual({});
    });
  });

  describe("rehydration", () => {
    it("restores definitions from savedDefinitions on rehydration", async () => {
      const storage = createTestStorage();
      const store1 = createDefinitionStore({ storage });
      store1.getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await store1.getState().updateDefinition("feature-a", { variations: [{ value: 99 }] });

      // Create a new store from the same storage — simulates page reload
      const store2 = createDefinitionStore({ storage });
      // Wait for rehydration
      await new Promise((resolve) => setTimeout(resolve, 50));
      const state = store2.getState();
      // definitions should be cloned from savedDefinitions (not the dirty working copy)
      expect(state.definitions).toEqual(state.savedDefinitions);
      expect(state.dirtyKeys).toEqual([]);
      expect(state.validationErrors).toEqual({});
    });

    it("handles rehydration failure gracefully when storage has invalid data", () => {
      const storage = createTestStorage();
      // Store invalid JSON that will cause rehydration to call onRehydrateStorage with undefined state
      storage.setItem("showwhat-configurator", "not-valid-json");
      // Should not throw
      expect(() => createDefinitionStore({ storage })).not.toThrow();
    });

    it("migrates v1 inlinePresets to filePresets and initialises sourcePresets", async () => {
      const storage = createTestStorage();
      // Simulate persisted state from v1 where the combined field was called inlinePresets.
      const persisted = {
        state: {
          savedDefinitions: { "feature-a": { variations: [{ value: true }] } },
          inlinePresets: { tier: { type: "string", key: "tier" } },
          selectedKey: null,
          sourceFileName: null,
          sourceFormat: null,
        },
        version: 1,
      };
      storage.setItem("showwhat-configurator", JSON.stringify(persisted));

      const store2 = createDefinitionStore({ storage });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(store2.getState().filePresets).toEqual({ tier: { type: "string", key: "tier" } });
      expect(store2.getState().sourcePresets).toEqual({});
    });

    it("defaults filePresets and sourcePresets to empty objects when persisted values are null", async () => {
      const storage = createTestStorage();
      const persisted = {
        state: {
          savedDefinitions: { "feature-a": { variations: [{ value: true }] } },
          filePresets: null,
          sourcePresets: null,
          selectedKey: null,
          sourceFileName: null,
          sourceFormat: null,
        },
        version: 2,
      };
      storage.setItem("showwhat-configurator", JSON.stringify(persisted));

      const store2 = createDefinitionStore({ storage });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(store2.getState().filePresets).toEqual({});
      expect(store2.getState().sourcePresets).toEqual({});
    });

    it("returns persisted state as-is for unrecognised migration versions", async () => {
      const storage = createTestStorage();
      const persisted = {
        state: {
          savedDefinitions: { "feature-a": { variations: [{ value: true }] } },
          filePresets: { tier: { type: "string", key: "tier" } },
          sourcePresets: {},
          definitionPresets: {},
          selectedKey: null,
          sourceFileName: "flags.yaml",
          sourceFormat: "yaml",
        },
        version: 0,
      };
      storage.setItem("showwhat-configurator", JSON.stringify(persisted));

      const store2 = createDefinitionStore({ storage });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(store2.getState().filePresets).toEqual({ tier: { type: "string", key: "tier" } });
      expect(store2.getState().sourceFileName).toBe("flags.yaml");
    });

    it("defaults definitionPresets to empty object on rehydrate when null", async () => {
      const storage = createTestStorage();
      const persisted = {
        state: {
          savedDefinitions: { "feature-a": { variations: [{ value: true }] } },
          filePresets: {},
          sourcePresets: {},
          definitionPresets: null,
          selectedKey: null,
          sourceFileName: null,
          sourceFormat: null,
        },
        version: 3,
      };
      storage.setItem("showwhat-configurator", JSON.stringify(persisted));

      const store2 = createDefinitionStore({ storage });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(store2.getState().definitionPresets).toEqual({});
    });

    it("defaults filePresets to empty on v1 migration when inlinePresets is null", async () => {
      const storage = createTestStorage();
      const persisted = {
        state: {
          savedDefinitions: {},
          inlinePresets: null,
          selectedKey: null,
          sourceFileName: null,
          sourceFormat: null,
        },
        version: 1,
      };
      storage.setItem("showwhat-configurator", JSON.stringify(persisted));

      const store2 = createDefinitionStore({ storage });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(store2.getState().filePresets).toEqual({});
    });
  });

  describe("isKeyDirty", () => {
    it("should return true for dirty keys", async () => {
      getState().importDefinitions(sampleDefinitions, "test.yaml", "yaml");
      await getState().updateDefinition("feature-a", { variations: [{ value: 99 }] });
      expect(getState().isKeyDirty("feature-a")).toBe(true);
      expect(getState().isKeyDirty("feature-b")).toBe(false);
    });
  });

  describe("saveDefinition edge cases", () => {
    it("does nothing when saving a non-existent key", async () => {
      await getState().saveDefinition("non-existent");
      expect(getState().dirtyKeys).toEqual([]);
    });
  });
});

describe("createTestStorage", () => {
  let storage: StateStorage;

  beforeEach(() => {
    storage = createTestStorage();
  });

  it("getItem returns null for missing keys", () => {
    expect(storage.getItem("missing")).toBeNull();
  });

  it("setItem and getItem round-trip", () => {
    storage.setItem("key", "value");
    expect(storage.getItem("key")).toBe("value");
  });

  it("removeItem deletes a stored key", () => {
    storage.setItem("key", "value");
    storage.removeItem("key");
    expect(storage.getItem("key")).toBeNull();
  });
});

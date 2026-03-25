import { describe, it, expect, beforeEach } from "vitest";
import { createPresetStore } from "./preset-store.js";
import { createTestStorage } from "./test-storage.js";

let store: ReturnType<typeof createPresetStore>;

describe("preset-store", () => {
  beforeEach(() => {
    store = createPresetStore({ storage: createTestStorage() });
  });

  it("starts with empty presets", () => {
    const state = store.getState();
    expect(state.presets).toEqual({});
    expect(state.presetYaml).toBe("");
    expect(state.parseError).toBeNull();
  });

  it("parses valid YAML and updates presets", () => {
    store.getState().setPresetYaml('tier:\n  type: string\n  key: "tier"');
    const state = store.getState();
    expect(state.parseError).toBeNull();
    expect(state.presets).toHaveProperty("tier");
    expect(state.presets.tier.type).toBe("string");
    expect(state.presets.tier.key).toBe("tier");
  });

  it("parses valid JSON and updates presets", () => {
    store.getState().setPresetYaml('{"tier": {"type": "string", "key": "tier"}}');
    const state = store.getState();
    expect(state.parseError).toBeNull();
    expect(state.presets.tier.type).toBe("string");
  });

  it("sets parseError for invalid YAML/JSON", () => {
    store.getState().setPresetYaml("{invalid yaml::: {{");
    const state = store.getState();
    expect(state.parseError).not.toBeNull();
  });

  it("sets parseError for schema validation failure", () => {
    store.getState().setPresetYaml("bad:\n  type: string");
    const state = store.getState();
    expect(state.parseError).not.toBeNull();
    expect(state.parseError).toContain("key");
  });

  it("handles empty input", () => {
    store.getState().setPresetYaml("");
    const state = store.getState();
    expect(state.parseError).toBeNull();
    expect(state.presets).toEqual({});
  });

  it("handles whitespace-only input", () => {
    store.getState().setPresetYaml("   \n  ");
    const state = store.getState();
    expect(state.parseError).toBeNull();
    expect(state.presets).toEqual({});
  });

  it("setPresets updates presets directly and clears yaml and error", () => {
    store.getState().setPresetYaml("{invalid yaml::: {{");
    expect(store.getState().parseError).not.toBeNull();

    store.getState().setPresets({ tier: { type: "string", key: "tier" } });
    const state = store.getState();
    expect(state.presets).toHaveProperty("tier");
    expect(state.presets.tier.type).toBe("string");
    expect(state.presetYaml).toBe("");
    expect(state.parseError).toBeNull();
  });

  it("setPresets with empty object clears presets", () => {
    store.getState().setPresets({ tier: { type: "string", key: "tier" } });
    expect(store.getState().presets).toHaveProperty("tier");

    store.getState().setPresets({});
    expect(store.getState().presets).toEqual({});
  });

  it("persists and rehydrates state", async () => {
    const storage = createTestStorage();
    const store1 = createPresetStore({ storage });
    store1.getState().setPresetYaml('tier:\n  type: string\n  key: "tier"');
    expect(store1.getState().presets).toHaveProperty("tier");

    // Create a new store with the same storage to simulate rehydration
    const store2 = createPresetStore({ storage });
    // Zustand persist rehydrates asynchronously
    await new Promise((r) => setTimeout(r, 10));
    const state2 = store2.getState();
    expect(state2.presets).toHaveProperty("tier");
  });
});

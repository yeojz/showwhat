import { describe, it, expect, beforeEach } from "vitest";
import { ErrorCode, StandardResolutionReasons } from "@openfeature/server-sdk";
import type { DefinitionReader, Definition, Definitions } from "showwhat";
import { MemoryData } from "showwhat";
import { ShowwhatProvider } from "./provider.js";

async function createProvider(definitions: Record<string, unknown>): Promise<ShowwhatProvider> {
  const data = await MemoryData.fromObject({ definitions });
  const provider = new ShowwhatProvider({ data });
  await provider.initialize();
  return provider;
}

describe("ShowwhatProvider", () => {
  describe("metadata", () => {
    it("has name 'showwhat'", async () => {
      const provider = await createProvider({});
      expect(provider.metadata.name).toBe("showwhat");
    });

    it("has runsOn 'server'", async () => {
      const provider = await createProvider({});
      expect(provider.runsOn).toBe("server");
    });
  });

  describe("resolveBooleanEvaluation", () => {
    let provider: ShowwhatProvider;

    beforeEach(async () => {
      provider = await createProvider({
        "flag.enabled": {
          variations: [
            { value: false, conditions: [{ type: "env", value: "production" }] },
            { value: true },
          ],
        },
      });
    });

    it("resolves a boolean flag with targeting", async () => {
      const result = await provider.resolveBooleanEvaluation("flag.enabled", true, {
        env: "production",
      });

      expect(result.value).toBe(false);
      expect(result.variant).toBe("0");
      expect(result.reason).toBe(StandardResolutionReasons.TARGETING_MATCH);
    });

    it("resolves a boolean flag with static fallback", async () => {
      const result = await provider.resolveBooleanEvaluation("flag.enabled", false, {
        env: "staging",
      });

      expect(result.value).toBe(true);
      expect(result.variant).toBe("1");
      expect(result.reason).toBe(StandardResolutionReasons.STATIC);
    });

    it("returns default with TYPE_MISMATCH when value is not boolean", async () => {
      const p = await createProvider({
        "flag.string": { variations: [{ value: "hello" }] },
      });

      const result = await p.resolveBooleanEvaluation("flag.string", false, {});

      expect(result.value).toBe(false);
      expect(result.errorCode).toBe(ErrorCode.TYPE_MISMATCH);
      expect(result.reason).toBe(StandardResolutionReasons.ERROR);
    });

    it("returns default with FLAG_NOT_FOUND for missing key", async () => {
      const result = await provider.resolveBooleanEvaluation("missing", true, {});

      expect(result.value).toBe(true);
      expect(result.errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
      expect(result.reason).toBe(StandardResolutionReasons.ERROR);
    });
  });

  describe("resolveStringEvaluation", () => {
    let provider: ShowwhatProvider;

    beforeEach(async () => {
      provider = await createProvider({
        "flag.color": {
          variations: [
            { value: "red", conditions: [{ type: "bool", key: "admin", value: true }] },
            { value: "blue" },
          ],
        },
      });
    });

    it("resolves a string flag", async () => {
      const result = await provider.resolveStringEvaluation("flag.color", "default", {
        admin: true,
      });

      expect(result.value).toBe("red");
      expect(result.variant).toBe("0");
      expect(result.reason).toBe(StandardResolutionReasons.TARGETING_MATCH);
    });

    it("resolves to static fallback", async () => {
      const result = await provider.resolveStringEvaluation("flag.color", "default", {
        admin: false,
      });

      expect(result.value).toBe("blue");
      expect(result.variant).toBe("1");
      expect(result.reason).toBe(StandardResolutionReasons.STATIC);
    });

    it("returns TYPE_MISMATCH when value is number", async () => {
      const p = await createProvider({
        "flag.num": { variations: [{ value: 42 }] },
      });

      const result = await p.resolveStringEvaluation("flag.num", "default", {});

      expect(result.value).toBe("default");
      expect(result.errorCode).toBe(ErrorCode.TYPE_MISMATCH);
    });
  });

  describe("resolveNumberEvaluation", () => {
    let provider: ShowwhatProvider;

    beforeEach(async () => {
      provider = await createProvider({
        "flag.limit": {
          variations: [{ value: 100 }],
        },
      });
    });

    it("resolves a number flag", async () => {
      const result = await provider.resolveNumberEvaluation("flag.limit", 0, {});

      expect(result.value).toBe(100);
      expect(result.variant).toBe("0");
      expect(result.reason).toBe(StandardResolutionReasons.STATIC);
    });

    it("returns TYPE_MISMATCH when value is string", async () => {
      const p = await createProvider({
        "flag.str": { variations: [{ value: "nope" }] },
      });

      const result = await p.resolveNumberEvaluation("flag.str", 0, {});

      expect(result.value).toBe(0);
      expect(result.errorCode).toBe(ErrorCode.TYPE_MISMATCH);
    });
  });

  describe("resolveObjectEvaluation", () => {
    it("resolves an object flag", async () => {
      const provider = await createProvider({
        "flag.config": {
          variations: [{ value: { theme: "dark", fontSize: 14 } }],
        },
      });

      const result = await provider.resolveObjectEvaluation("flag.config", {}, {});

      expect(result.value).toEqual({ theme: "dark", fontSize: 14 });
      expect(result.reason).toBe(StandardResolutionReasons.STATIC);
    });

    it("resolves an array flag", async () => {
      const provider = await createProvider({
        "flag.tags": {
          variations: [{ value: ["alpha", "beta"] }],
        },
      });

      const result = await provider.resolveObjectEvaluation("flag.tags", [], {});

      expect(result.value).toEqual(["alpha", "beta"]);
      expect(result.reason).toBe(StandardResolutionReasons.STATIC);
    });

    it("resolves a null flag", async () => {
      const provider = await createProvider({
        "flag.empty": {
          variations: [{ value: null }],
        },
      });

      const result = await provider.resolveObjectEvaluation("flag.empty", null, {});

      expect(result.value).toBe(null);
      expect(result.reason).toBe(StandardResolutionReasons.STATIC);
    });

    it("returns TYPE_MISMATCH when value contains non-JSON types", async () => {
      const nonJsonDefinition = {
        active: true,
        variations: [{ value: [undefined] }],
      } as unknown as Definition;
      const data: DefinitionReader = {
        async get(key: string) {
          return key === "flag.bad" ? nonJsonDefinition : null;
        },
        async getAll(): Promise<Definitions> {
          return { "flag.bad": nonJsonDefinition };
        },
      };
      const provider = new ShowwhatProvider({ data });

      const result = await provider.resolveObjectEvaluation("flag.bad", [], {});

      expect(result.value).toEqual([]);
      expect(result.errorCode).toBe(ErrorCode.TYPE_MISMATCH);
      expect(result.reason).toBe(StandardResolutionReasons.ERROR);
    });
  });

  describe("inactive definitions", () => {
    it("returns FLAG_NOT_FOUND for inactive flags", async () => {
      const provider = await createProvider({
        "flag.off": {
          active: false,
          variations: [{ value: true }],
        },
      });

      const result = await provider.resolveBooleanEvaluation("flag.off", false, {});

      expect(result.value).toBe(false);
      expect(result.errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
      expect(result.reason).toBe(StandardResolutionReasons.ERROR);
    });
  });

  describe("onClose", () => {
    it("resolves without error when data has no close", async () => {
      const provider = await createProvider({});
      await expect(provider.onClose()).resolves.toBeUndefined();
    });

    it("calls data.close() if available", async () => {
      let closeCalled = false;
      const data = await MemoryData.fromObject({ definitions: {} });
      (data as Record<string, unknown>).close = async () => {
        closeCalled = true;
      };

      const provider = new ShowwhatProvider({ data });
      await provider.onClose();

      expect(closeCalled).toBe(true);
    });
  });

  describe("initialize", () => {
    it("calls data.load() if available", async () => {
      let loadCalled = false;
      const data = await MemoryData.fromObject({ definitions: {} });
      (data as Record<string, unknown>).load = async () => {
        loadCalled = true;
      };

      const provider = new ShowwhatProvider({ data });
      await provider.initialize();

      expect(loadCalled).toBe(true);
    });
  });

  describe("variant identifier", () => {
    it("uses variation id when present", async () => {
      const provider = await createProvider({
        "flag.v": {
          variations: [
            { id: "control", value: "a", conditions: [{ type: "env", value: "prod" }] },
            { id: "treatment", value: "b" },
          ],
        },
      });

      const result = await provider.resolveStringEvaluation("flag.v", "x", { env: "prod" });
      expect(result.variant).toBe("control");
    });

    it("falls back to index when variation id is absent", async () => {
      const provider = await createProvider({
        "flag.v": {
          variations: [{ value: "a" }],
        },
      });

      const result = await provider.resolveStringEvaluation("flag.v", "x", {});
      expect(result.variant).toBe("0");
    });
  });

  describe("context mapping", () => {
    it("passes OpenFeature context to showwhat", async () => {
      const provider = await createProvider({
        "flag.env": {
          variations: [
            { value: "prod-value", conditions: [{ type: "env", value: "production" }] },
            { value: "default-value" },
          ],
        },
      });

      const result = await provider.resolveStringEvaluation("flag.env", "fallback", {
        env: "production",
        targetingKey: "user-1",
      });

      expect(result.value).toBe("prod-value");
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { S3Data } from "./s3-data.js";
import { S3ConflictError } from "./errors.js";
import type { S3RequestSigner } from "./types.js";
import type { Definition, Definitions, Presets } from "@showwhat/core";

function createMockSigner(): S3RequestSigner {
  return { sign: vi.fn(async (req: Request) => req) };
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: `"etag-${Math.random().toString(36).slice(2)}"`,
      ...init?.headers,
    },
    ...init,
  });
}

function xmlListResponse(keys: string[]): Response {
  const contents = keys.map((k) => `<Contents><Key>${k}</Key></Contents>`).join("\n  ");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <IsTruncated>false</IsTruncated>
  ${contents}
</ListBucketResult>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}

const FEAT_A: Definition = { variations: [{ value: true }] };
const FEAT_B: Definition = { variations: [{ value: 42 }] };

describe("S3Data — read operations", () => {
  let s3: S3Data;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    s3 = new S3Data({
      endpoint: "https://s3.example.com",
      bucket: "test-bucket",
      signer: createMockSigner(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("get", () => {
    it("returns a definition by key", async () => {
      fetchMock.mockResolvedValue(jsonResponse(FEAT_A, { headers: { ETag: '"etag-a"' } }));

      const result = await s3.get("feature-a");
      expect(result).toEqual(FEAT_A);
    });

    it("returns null for missing key (404)", async () => {
      fetchMock.mockResolvedValue(new Response("Not Found", { status: 404 }));

      const result = await s3.get("missing");
      expect(result).toBeNull();
    });

    it("handles response with empty etag", async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(FEAT_A), { status: 200 }));

      const result = await s3.get("feature-a");
      expect(result).toEqual(FEAT_A);
    });

    it("caches ETag from GET response", async () => {
      fetchMock.mockResolvedValue(jsonResponse(FEAT_A, { headers: { ETag: '"etag-a"' } }));
      await s3.get("feature-a");

      // Now put — should use If-Match with cached ETag
      fetchMock.mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { ETag: '"etag-a2"' },
        }),
      );
      await s3.put("feature-a", FEAT_A);

      const putCall = fetchMock.mock.calls[1];
      const req = putCall[0] as Request;
      expect(req.headers.get("If-Match")).toBe('"etag-a"');
    });
  });

  describe("getAll", () => {
    it("lists keys then fetches each definition", async () => {
      // First call: listObjects
      fetchMock.mockResolvedValueOnce(
        xmlListResponse(["definitions/feature-a.json", "definitions/feature-b.json"]),
      );
      // Second call: get feature-a
      fetchMock.mockResolvedValueOnce(jsonResponse(FEAT_A, { headers: { ETag: '"ea"' } }));
      // Third call: get feature-b
      fetchMock.mockResolvedValueOnce(jsonResponse(FEAT_B, { headers: { ETag: '"eb"' } }));

      const all = await s3.getAll();
      expect(all).toEqual({
        "feature-a": FEAT_A,
        "feature-b": FEAT_B,
      });
    });

    it("returns empty object when no definitions exist", async () => {
      fetchMock.mockResolvedValue(xmlListResponse([]));
      const all = await s3.getAll();
      expect(all).toEqual({});
    });

    it("skips definitions that return 404 during fetch", async () => {
      fetchMock.mockResolvedValueOnce(
        xmlListResponse(["definitions/feature-a.json", "definitions/gone.json"]),
      );
      fetchMock.mockResolvedValueOnce(jsonResponse(FEAT_A, { headers: { ETag: '"ea"' } }));
      fetchMock.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

      const all = await s3.getAll();
      expect(all).toEqual({ "feature-a": FEAT_A });
    });

    it("handles responses with empty etag", async () => {
      fetchMock.mockResolvedValueOnce(xmlListResponse(["definitions/feature-a.json"]));
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(FEAT_A), { status: 200 }));

      const all = await s3.getAll();
      expect(all).toEqual({ "feature-a": FEAT_A });
    });
  });

  describe("listKeys", () => {
    it("returns keys stripped of prefix and extension", async () => {
      fetchMock.mockResolvedValue(
        xmlListResponse(["definitions/feature-a.json", "definitions/feature-b.json"]),
      );

      const keys = await s3.listKeys();
      expect(keys).toEqual(["feature-a", "feature-b"]);
    });

    it("returns empty array when no definitions exist", async () => {
      fetchMock.mockResolvedValue(xmlListResponse([]));
      const keys = await s3.listKeys();
      expect(keys).toEqual([]);
    });
  });

  describe("put", () => {
    it("uses If-Match with cached ETag for existing key", async () => {
      // First read to cache ETag
      fetchMock.mockResolvedValueOnce(
        jsonResponse(FEAT_A, { headers: { ETag: '"etag-original"' } }),
      );
      await s3.get("feature-a");

      // Now put
      fetchMock.mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { ETag: '"etag-updated"' },
        }),
      );
      await s3.put("feature-a", { ...FEAT_A, active: true });

      const putReq = fetchMock.mock.calls[1][0] as Request;
      expect(putReq.headers.get("If-Match")).toBe('"etag-original"');
    });

    it("uses If-None-Match: * for new keys (no cached ETag)", async () => {
      fetchMock.mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { ETag: '"new-etag"' },
        }),
      );

      await s3.put("brand-new", FEAT_A);

      const putReq = fetchMock.mock.calls[0][0] as Request;
      expect(putReq.headers.get("If-None-Match")).toBe("*");
    });

    it("updates cached ETag after successful put", async () => {
      // Put new key
      fetchMock.mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { ETag: '"first-write"' },
        }),
      );
      await s3.put("feature-x", FEAT_A);

      // Second put should use the ETag from first write
      fetchMock.mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { ETag: '"second-write"' },
        }),
      );
      await s3.put("feature-x", FEAT_B);

      const secondReq = fetchMock.mock.calls[1][0] as Request;
      expect(secondReq.headers.get("If-Match")).toBe('"first-write"');
    });

    it("throws S3ConflictError when S3 returns 412", async () => {
      // First read to cache ETag
      fetchMock.mockResolvedValueOnce(jsonResponse(FEAT_A, { headers: { ETag: '"stale"' } }));
      await s3.get("feature-a");

      // Put returns 412
      fetchMock.mockResolvedValueOnce(new Response("Precondition Failed", { status: 412 }));

      await expect(s3.put("feature-a", FEAT_B)).rejects.toThrow(S3ConflictError);
    });

    it("re-throws non-412 errors from put", async () => {
      fetchMock.mockResolvedValueOnce(new Response("Server Error", { status: 500 }));

      await expect(s3.put("feature-a", FEAT_A)).rejects.toThrow("S3 request failed");
    });
  });

  describe("delete", () => {
    it("deletes an object and clears cached ETag", async () => {
      // Cache an ETag
      fetchMock.mockResolvedValueOnce(jsonResponse(FEAT_A, { headers: { ETag: '"to-delete"' } }));
      await s3.get("feature-a");

      // Delete
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await s3.delete("feature-a");

      const deleteReq = fetchMock.mock.calls[1][0] as Request;
      expect(deleteReq.method).toBe("DELETE");

      // Next put should use If-None-Match (ETag was cleared)
      fetchMock.mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { ETag: '"recreated"' },
        }),
      );
      await s3.put("feature-a", FEAT_A);

      const putReq = fetchMock.mock.calls[2][0] as Request;
      expect(putReq.headers.get("If-None-Match")).toBe("*");
    });
  });

  describe("putMany", () => {
    it("puts multiple definitions", async () => {
      fetchMock.mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { ETag: '"bulk"' },
        }),
      );

      const defs: Definitions = {
        "feat-a": FEAT_A,
        "feat-b": FEAT_B,
      };
      await s3.putMany(defs);

      // Should have made 2 PUT calls
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("uses forcePut when replace option is true", async () => {
      // Cache an ETag for feat-a
      fetchMock.mockResolvedValueOnce(jsonResponse(FEAT_A, { headers: { ETag: '"existing"' } }));
      await s3.get("feat-a");

      fetchMock.mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { ETag: '"replaced"' },
        }),
      );

      await s3.putMany({ "feat-a": FEAT_B }, { replace: true });

      // The PUT for feat-a with replace should NOT have If-Match
      const putReq = fetchMock.mock.calls[1][0] as Request;
      expect(putReq.headers.get("If-Match")).toBeNull();
      expect(putReq.headers.get("If-None-Match")).toBeNull();
    });
  });

  describe("forcePut", () => {
    it("skips ETag check even when ETag is cached", async () => {
      // Cache an ETag
      fetchMock.mockResolvedValueOnce(jsonResponse(FEAT_A, { headers: { ETag: '"cached"' } }));
      await s3.get("feature-a");

      // Force put
      fetchMock.mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { ETag: '"forced"' },
        }),
      );
      await s3.forcePut("feature-a", FEAT_B);

      const putReq = fetchMock.mock.calls[1][0] as Request;
      expect(putReq.headers.get("If-Match")).toBeNull();
      expect(putReq.headers.get("If-None-Match")).toBeNull();
    });
  });

  describe("getPresets", () => {
    it("reads the default preset file", async () => {
      const presets: Presets = {
        staging: { type: "string", key: "env" },
      };
      fetchMock.mockResolvedValue(jsonResponse(presets));

      const result = await s3.getPresets();
      expect(result).toEqual(presets);

      const req = fetchMock.mock.calls[0][0] as Request;
      expect(req.url).toContain("presets/_default.json");
    });

    it("reads a named preset file", async () => {
      const presets: Presets = {
        beta: { type: "string", key: "tier" },
      };
      fetchMock.mockResolvedValue(jsonResponse(presets));

      await s3.getPresets("beta");

      const req = fetchMock.mock.calls[0][0] as Request;
      expect(req.url).toContain("presets/beta.json");
    });

    it("returns empty object when preset file is missing (404)", async () => {
      fetchMock.mockResolvedValue(new Response("Not Found", { status: 404 }));

      const result = await s3.getPresets();
      expect(result).toEqual({});
    });
  });

  describe("lifecycle", () => {
    it("load() calls HEAD bucket", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
      await s3.load();

      const req = fetchMock.mock.calls[0][0] as Request;
      expect(req.method).toBe("HEAD");
    });

    it("close() is a no-op", async () => {
      await s3.close();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("ping() calls HEAD bucket", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
      await s3.ping();

      const req = fetchMock.mock.calls[0][0] as Request;
      expect(req.method).toBe("HEAD");
    });

    it("reload() clears ETag cache and re-fetches all definitions", async () => {
      // Seed an ETag
      fetchMock.mockResolvedValueOnce(jsonResponse(FEAT_A, { headers: { ETag: '"old"' } }));
      await s3.get("feature-a");

      // Reload: list then fetch
      fetchMock.mockResolvedValueOnce(xmlListResponse(["definitions/feature-a.json"]));
      fetchMock.mockResolvedValueOnce(jsonResponse(FEAT_B, { headers: { ETag: '"new"' } }));

      const result = await s3.reload();
      expect(result).toEqual({ "feature-a": FEAT_B });

      // Verify old ETag was cleared — next put should use new ETag
      fetchMock.mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { ETag: '"newest"' },
        }),
      );
      await s3.put("feature-a", FEAT_A);

      const putReq = fetchMock.mock.calls[3][0] as Request;
      expect(putReq.headers.get("If-Match")).toBe('"new"');
    });
  });
});

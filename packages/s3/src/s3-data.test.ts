import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { S3Data } from "./s3-data.js";
import type { S3RequestSigner } from "./types.js";
import type { Definition } from "@showwhat/core";

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
});

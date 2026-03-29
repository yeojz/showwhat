import { describe, it, expect, vi, beforeEach } from "vitest";
import { S3Client } from "./s3-client.js";
import { S3AuthError, S3StorageError } from "./errors.js";
import type { S3RequestSigner } from "./types.js";

function createMockSigner(): S3RequestSigner {
  return { sign: vi.fn(async (req: Request) => req) };
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function xmlResponse(body: string, init?: ResponseInit): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
    ...init,
  });
}

describe("S3Client", () => {
  let client: S3Client;
  let signer: S3RequestSigner;

  beforeEach(() => {
    signer = createMockSigner();
    client = new S3Client({
      endpoint: "https://s3.us-east-1.amazonaws.com",
      bucket: "my-bucket",
      signer,
    });
  });

  describe("getObject", () => {
    it("fetches an object and returns body + etag", async () => {
      const body = { id: "feat", variations: [{ value: true }] };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(body, {
            headers: {
              "Content-Type": "application/json",
              ETag: '"abc123"',
            },
          }),
        ),
      );

      const result = await client.getObject("definitions/feat.json");
      expect(result).not.toBeNull();
      expect(result!.body).toEqual(body);
      expect(result!.etag).toBe('"abc123"');

      const call = vi.mocked(fetch).mock.calls[0];
      const req = call[0] as Request;
      expect(req.method).toBe("GET");
      expect(req.url).toBe("https://s3.us-east-1.amazonaws.com/my-bucket/definitions/feat.json");
    });

    it("returns null for 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 })));
      const result = await client.getObject("definitions/missing.json");
      expect(result).toBeNull();
    });

    it("throws S3AuthError for 403", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 })));
      await expect(client.getObject("definitions/feat.json")).rejects.toThrow(S3AuthError);
    });

    it("throws S3AuthError for 401", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })),
      );
      await expect(client.getObject("definitions/feat.json")).rejects.toThrow(S3AuthError);
    });

    it("throws S3StorageError for other errors", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Error", { status: 500 })));
      await expect(client.getObject("definitions/feat.json")).rejects.toThrow(S3StorageError);
    });
  });

  describe("putObject", () => {
    it("sends PUT with JSON body", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(null, {
            status: 200,
            headers: { ETag: '"new-etag"' },
          }),
        ),
      );

      const body = { id: "feat", variations: [{ value: true }] };
      const etag = await client.putObject("definitions/feat.json", body);
      expect(etag).toBe('"new-etag"');

      const call = vi.mocked(fetch).mock.calls[0];
      const req = call[0] as Request;
      expect(req.method).toBe("PUT");
      expect(req.headers.get("Content-Type")).toBe("application/json");
    });

    it("sends If-Match header when etag provided", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(null, {
            status: 200,
            headers: { ETag: '"updated"' },
          }),
        ),
      );

      await client.putObject("definitions/feat.json", {}, { etag: '"abc"' });

      const call = vi.mocked(fetch).mock.calls[0];
      const req = call[0] as Request;
      expect(req.headers.get("If-Match")).toBe('"abc"');
    });

    it("sends If-None-Match: * when ifNoneMatch is true", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(null, {
            status: 200,
            headers: { ETag: '"new"' },
          }),
        ),
      );

      await client.putObject("definitions/feat.json", {}, { ifNoneMatch: true });

      const call = vi.mocked(fetch).mock.calls[0];
      const req = call[0] as Request;
      expect(req.headers.get("If-None-Match")).toBe("*");
    });

    it("throws S3StorageError with status 412 for precondition failed", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("Precondition Failed", { status: 412 })),
      );

      const err = await client
        .putObject("definitions/feat.json", {}, { etag: '"old"' })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(S3StorageError);
      expect((err as S3StorageError).status).toBe(412);
    });
  });

  describe("deleteObject", () => {
    it("sends DELETE request", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

      await client.deleteObject("definitions/feat.json");

      const call = vi.mocked(fetch).mock.calls[0];
      const req = call[0] as Request;
      expect(req.method).toBe("DELETE");
    });
  });

  describe("headBucket", () => {
    it("succeeds on 200", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      await expect(client.headBucket()).resolves.toBeUndefined();
    });

    it("throws S3AuthError on 403", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
      await expect(client.headBucket()).rejects.toThrow(S3AuthError);
    });
  });

  describe("listObjects", () => {
    it("lists objects with prefix", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <IsTruncated>false</IsTruncated>
  <Contents><Key>definitions/a.json</Key></Contents>
  <Contents><Key>definitions/b.json</Key></Contents>
</ListBucketResult>`;

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(xmlResponse(xml)));

      const keys = await client.listObjects("definitions/");
      expect(keys).toEqual(["definitions/a.json", "definitions/b.json"]);

      const call = vi.mocked(fetch).mock.calls[0];
      const req = call[0] as Request;
      expect(req.method).toBe("GET");
      const url = new URL(req.url);
      expect(url.searchParams.get("list-type")).toBe("2");
      expect(url.searchParams.get("prefix")).toBe("definitions/");
    });

    it("handles pagination across multiple pages", async () => {
      const page1 = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <IsTruncated>true</IsTruncated>
  <NextContinuationToken>token1</NextContinuationToken>
  <Contents><Key>definitions/a.json</Key></Contents>
</ListBucketResult>`;

      const page2 = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <IsTruncated>false</IsTruncated>
  <Contents><Key>definitions/b.json</Key></Contents>
</ListBucketResult>`;

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(xmlResponse(page1)).mockResolvedValueOnce(xmlResponse(page2)),
      );

      const keys = await client.listObjects("definitions/");
      expect(keys).toEqual(["definitions/a.json", "definitions/b.json"]);

      // Verify continuation token was sent in second request
      const call2 = vi.mocked(fetch).mock.calls[1];
      const req2 = call2[0] as Request;
      const url2 = new URL(req2.url);
      expect(url2.searchParams.get("continuation-token")).toBe("token1");
    });

    it("returns empty array for empty bucket", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <IsTruncated>false</IsTruncated>
</ListBucketResult>`;

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(xmlResponse(xml)));
      const keys = await client.listObjects("definitions/");
      expect(keys).toEqual([]);
    });
  });

  describe("prefix option", () => {
    it("prepends prefix to object paths", async () => {
      const prefixedClient = new S3Client({
        endpoint: "https://s3.us-east-1.amazonaws.com",
        bucket: "my-bucket",
        prefix: "tenant-a",
        signer,
      });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            {},
            {
              headers: {
                "Content-Type": "application/json",
                ETag: '"x"',
              },
            },
          ),
        ),
      );

      await prefixedClient.getObject("definitions/feat.json");

      const call = vi.mocked(fetch).mock.calls[0];
      const req = call[0] as Request;
      expect(req.url).toBe(
        "https://s3.us-east-1.amazonaws.com/my-bucket/tenant-a/definitions/feat.json",
      );
    });
  });
});

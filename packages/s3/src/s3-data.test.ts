import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { S3Data } from "./s3-data.js";
import { S3ConflictError, S3AuthError, S3StorageError } from "./errors.js";
import type { Definition, Presets } from "@showwhat/core";

function mockBody(data: unknown) {
  return { transformToString: vi.fn().mockResolvedValue(JSON.stringify(data)) };
}

function sdkError(name: string, status: number): Error {
  return Object.assign(new Error(name), {
    name,
    $metadata: { httpStatusCode: status },
  });
}

const FEAT_A: Definition = { variations: [{ value: true }] };
const FEAT_B: Definition = { variations: [{ value: 42 }] };

describe("S3Data", () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let s3: S3Data;

  beforeEach(() => {
    mockSend = vi.fn();
    s3 = new S3Data({
      client: { send: mockSend } as unknown as S3Client,
      bucket: "test-bucket",
    });
  });

  describe("get", () => {
    it("returns a definition by key", async () => {
      mockSend.mockResolvedValue({ Body: mockBody(FEAT_A), ETag: '"etag-a"' });
      const result = await s3.get("feature-a");
      expect(result).toEqual(FEAT_A);

      const cmd = mockSend.mock.calls[0][0];
      expect(cmd).toBeInstanceOf(GetObjectCommand);
      expect(cmd.input).toEqual({ Bucket: "test-bucket", Key: "definitions/feature-a.json" });
    });

    it("returns null for missing key (NoSuchKey)", async () => {
      mockSend.mockRejectedValue(sdkError("NoSuchKey", 404));
      expect(await s3.get("missing")).toBeNull();
    });

    it("returns null for NotFound error", async () => {
      mockSend.mockRejectedValue(sdkError("NotFound", 404));
      expect(await s3.get("missing")).toBeNull();
    });

    it("caches ETag from GET response", async () => {
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"etag-a"' });
      await s3.get("feature-a");

      mockSend.mockResolvedValueOnce({ ETag: '"etag-a2"' });
      await s3.put("feature-a", FEAT_A);

      const putCmd = mockSend.mock.calls[1][0];
      expect(putCmd.input.IfMatch).toBe('"etag-a"');
    });

    it("handles response with empty etag", async () => {
      mockSend.mockResolvedValue({ Body: mockBody(FEAT_A) });
      const result = await s3.get("feature-a");
      expect(result).toEqual(FEAT_A);
    });

    it("handles response with no Body", async () => {
      mockSend.mockResolvedValue({ Body: undefined });
      const result = await s3.get("feature-a");
      expect(result).toEqual({});
    });

    it("throws S3AuthError for 403", async () => {
      mockSend.mockRejectedValue(sdkError("AccessDenied", 403));
      await expect(s3.get("feature-a")).rejects.toThrow(S3AuthError);
    });

    it("throws S3StorageError for other errors", async () => {
      mockSend.mockRejectedValue(sdkError("InternalError", 500));
      await expect(s3.get("feature-a")).rejects.toThrow(S3StorageError);
    });

    it("throws S3StorageError with status 0 when error has no $metadata", async () => {
      mockSend.mockRejectedValue(new Error("network failure"));
      const err = await s3.get("feature-a").catch((e: unknown) => e);
      expect(err).toBeInstanceOf(S3StorageError);
      expect((err as S3StorageError).status).toBe(0);
    });

    it("throws S3StorageError when a non-Error value is thrown", async () => {
      mockSend.mockRejectedValue("plain string error");
      await expect(s3.get("feature-a")).rejects.toThrow(S3StorageError);
    });
  });

  describe("getAll", () => {
    it("lists keys then fetches each definition", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: "definitions/feature-a.json" }, { Key: "definitions/feature-b.json" }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"ea"' });
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_B), ETag: '"eb"' });

      const all = await s3.getAll();
      expect(all).toEqual({ "feature-a": FEAT_A, "feature-b": FEAT_B });
    });

    it("returns empty object when no definitions exist", async () => {
      mockSend.mockResolvedValue({ Contents: undefined, IsTruncated: false });
      expect(await s3.getAll()).toEqual({});
    });

    it("skips definitions that return 404 during fetch", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: "definitions/feature-a.json" }, { Key: "definitions/gone.json" }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"ea"' });
      mockSend.mockRejectedValueOnce(sdkError("NoSuchKey", 404));

      const all = await s3.getAll();
      expect(all).toEqual({ "feature-a": FEAT_A });
    });

    it("throws S3StorageError on non-404 error during individual fetch", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: "definitions/feature-a.json" }],
        IsTruncated: false,
      });
      mockSend.mockRejectedValueOnce(sdkError("InternalError", 500));

      await expect(s3.getAll()).rejects.toThrow(S3StorageError);
    });

    it("throws S3StorageError on list error", async () => {
      mockSend.mockRejectedValue(sdkError("InternalError", 500));
      await expect(s3.getAll()).rejects.toThrow(S3StorageError);
    });

    it("handles getAll with prefix: strips prefix from etag key path", async () => {
      const prefixedS3 = new S3Data({
        client: { send: mockSend } as unknown as S3Client,
        bucket: "test-bucket",
        prefix: "tenant-a",
      });
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: "tenant-a/definitions/feature-a.json" }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"ea"' });

      const all = await prefixedS3.getAll();
      expect(all).toEqual({ "feature-a": FEAT_A });
    });

    it("handles getAll with empty etag in inner fetch", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: "definitions/feature-a.json" }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A) });

      const all = await s3.getAll();
      expect(all).toEqual({ "feature-a": FEAT_A });
    });

    it("handles getAll with no Body in inner fetch", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: "definitions/feature-a.json" }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({ Body: undefined, ETag: '"ea"' });

      const all = await s3.getAll();
      expect(all).toEqual({ "feature-a": {} });
    });

    it("handles list result with object missing Key", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: undefined }, { Key: "definitions/feature-a.json" }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"ea"' });

      const all = await s3.getAll();
      expect(all).toEqual({ "feature-a": FEAT_A });
    });

    it("handles pagination", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: "definitions/a.json" }],
        IsTruncated: true,
        NextContinuationToken: "token1",
      });
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: "definitions/b.json" }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"ea"' });
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_B), ETag: '"eb"' });

      const all = await s3.getAll();
      expect(all).toEqual({ a: FEAT_A, b: FEAT_B });

      // Second list call should have continuation token
      const listCmd2 = mockSend.mock.calls[1][0];
      expect(listCmd2).toBeInstanceOf(ListObjectsV2Command);
      expect(listCmd2.input.ContinuationToken).toBe("token1");
    });
  });

  describe("listKeys", () => {
    it("returns keys stripped of prefix and extension", async () => {
      mockSend.mockResolvedValue({
        Contents: [{ Key: "definitions/feature-a.json" }, { Key: "definitions/feature-b.json" }],
        IsTruncated: false,
      });

      expect(await s3.listKeys()).toEqual(["feature-a", "feature-b"]);
    });

    it("returns empty array when no definitions exist", async () => {
      mockSend.mockResolvedValue({ IsTruncated: false });
      expect(await s3.listKeys()).toEqual([]);
    });
  });

  describe("put", () => {
    it("uses IfMatch with cached ETag for existing key", async () => {
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"original"' });
      await s3.get("feature-a");

      mockSend.mockResolvedValueOnce({ ETag: '"updated"' });
      await s3.put("feature-a", { ...FEAT_A, active: true });

      const putCmd = mockSend.mock.calls[1][0];
      expect(putCmd).toBeInstanceOf(PutObjectCommand);
      expect(putCmd.input.IfMatch).toBe('"original"');
      expect(putCmd.input.IfNoneMatch).toBeUndefined();
    });

    it("uses IfNoneMatch: * for new keys", async () => {
      mockSend.mockResolvedValue({ ETag: '"new"' });
      await s3.put("brand-new", FEAT_A);

      const putCmd = mockSend.mock.calls[0][0];
      expect(putCmd.input.IfNoneMatch).toBe("*");
      expect(putCmd.input.IfMatch).toBeUndefined();
    });

    it("updates cached ETag after successful put", async () => {
      mockSend.mockResolvedValueOnce({ ETag: '"first"' });
      await s3.put("feature-x", FEAT_A);

      mockSend.mockResolvedValueOnce({ ETag: '"second"' });
      await s3.put("feature-x", FEAT_B);

      const secondPut = mockSend.mock.calls[1][0];
      expect(secondPut.input.IfMatch).toBe('"first"');
    });

    it("throws S3ConflictError on 412", async () => {
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"stale"' });
      await s3.get("feature-a");

      mockSend.mockRejectedValueOnce(sdkError("PreconditionFailed", 412));
      await expect(s3.put("feature-a", FEAT_B)).rejects.toThrow(S3ConflictError);
    });

    it("re-throws non-412 errors", async () => {
      mockSend.mockRejectedValue(sdkError("InternalError", 500));
      await expect(s3.put("feature-a", FEAT_A)).rejects.toThrow(S3StorageError);
    });

    it("handles empty ETag in put response", async () => {
      mockSend.mockResolvedValue({});
      await s3.put("no-etag-key", FEAT_A);
      // Should not throw; ETag just won't be cached
    });
  });

  describe("delete", () => {
    it("deletes an object and clears cached ETag", async () => {
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"to-delete"' });
      await s3.get("feature-a");

      mockSend.mockResolvedValueOnce({});
      await s3.delete("feature-a");

      const delCmd = mockSend.mock.calls[1][0];
      expect(delCmd).toBeInstanceOf(DeleteObjectCommand);

      // Next put should use IfNoneMatch (ETag was cleared)
      mockSend.mockResolvedValueOnce({ ETag: '"recreated"' });
      await s3.put("feature-a", FEAT_A);
      expect(mockSend.mock.calls[2][0].input.IfNoneMatch).toBe("*");
    });

    it("throws S3StorageError on failure", async () => {
      mockSend.mockRejectedValue(sdkError("InternalError", 500));
      await expect(s3.delete("feature-a")).rejects.toThrow(S3StorageError);
    });
  });

  describe("putMany", () => {
    it("puts multiple definitions", async () => {
      mockSend.mockResolvedValue({ ETag: '"bulk"' });
      await s3.putMany({ "feat-a": FEAT_A, "feat-b": FEAT_B });
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("uses forcePut when replace is true", async () => {
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"existing"' });
      await s3.get("feat-a");

      mockSend.mockResolvedValue({ ETag: '"replaced"' });
      await s3.putMany({ "feat-a": FEAT_B }, { replace: true });

      const putCmd = mockSend.mock.calls[1][0];
      expect(putCmd.input.IfMatch).toBeUndefined();
      expect(putCmd.input.IfNoneMatch).toBeUndefined();
    });
  });

  describe("forcePut", () => {
    it("skips ETag check even when cached", async () => {
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"cached"' });
      await s3.get("feature-a");

      mockSend.mockResolvedValueOnce({ ETag: '"forced"' });
      await s3.forcePut("feature-a", FEAT_B);

      const putCmd = mockSend.mock.calls[1][0];
      expect(putCmd.input.IfMatch).toBeUndefined();
      expect(putCmd.input.IfNoneMatch).toBeUndefined();
    });

    it("throws on SDK error", async () => {
      mockSend.mockRejectedValue(sdkError("InternalError", 500));
      await expect(s3.forcePut("feature-a", FEAT_A)).rejects.toThrow(S3StorageError);
    });

    it("handles empty ETag in forcePut response", async () => {
      mockSend.mockResolvedValue({});
      await s3.forcePut("no-etag-key", FEAT_A);
      // Should not throw; ETag just won't be cached
    });
  });

  describe("getPresets", () => {
    it("reads the default preset file", async () => {
      const presets: Presets = { staging: { type: "string", key: "env" } };
      mockSend.mockResolvedValue({ Body: mockBody(presets), ETag: '"p"' });

      expect(await s3.getPresets()).toEqual(presets);

      const cmd = mockSend.mock.calls[0][0];
      expect(cmd.input.Key).toBe("presets/_default.json");
    });

    it("reads a named preset file", async () => {
      const presets: Presets = { beta: { type: "string", key: "tier" } };
      mockSend.mockResolvedValue({ Body: mockBody(presets) });

      await s3.getPresets("beta");
      expect(mockSend.mock.calls[0][0].input.Key).toBe("presets/beta.json");
    });

    it("returns empty object when preset file is missing", async () => {
      mockSend.mockRejectedValue(sdkError("NoSuchKey", 404));
      expect(await s3.getPresets()).toEqual({});
    });

    it("throws on non-404 error", async () => {
      mockSend.mockRejectedValue(sdkError("AccessDenied", 403));
      await expect(s3.getPresets()).rejects.toThrow(S3AuthError);
    });

    it("handles missing Body in preset response", async () => {
      mockSend.mockResolvedValue({ Body: undefined });
      const result = await s3.getPresets();
      expect(result).toEqual({});
    });
  });

  describe("lifecycle", () => {
    it("load() calls HeadBucket", async () => {
      mockSend.mockResolvedValue({});
      await s3.load();

      const cmd = mockSend.mock.calls[0][0];
      expect(cmd).toBeInstanceOf(HeadBucketCommand);
      expect(cmd.input).toEqual({ Bucket: "test-bucket" });
    });

    it("load() throws on auth error", async () => {
      mockSend.mockRejectedValue(sdkError("AccessDenied", 403));
      await expect(s3.load()).rejects.toThrow(S3AuthError);
    });

    it("close() is a no-op", async () => {
      await s3.close();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("ping() calls HeadBucket", async () => {
      mockSend.mockResolvedValue({});
      await s3.ping();
      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
    });

    it("reload() clears ETag cache and re-fetches", async () => {
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_A), ETag: '"old"' });
      await s3.get("feature-a");

      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: "definitions/feature-a.json" }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({ Body: mockBody(FEAT_B), ETag: '"new"' });

      const result = await s3.reload();
      expect(result).toEqual({ "feature-a": FEAT_B });

      // Next put should use new ETag
      mockSend.mockResolvedValueOnce({ ETag: '"newest"' });
      await s3.put("feature-a", FEAT_A);
      expect(mockSend.mock.calls[3][0].input.IfMatch).toBe('"new"');
    });
  });

  describe("prefix option", () => {
    let prefixedS3: S3Data;

    beforeEach(() => {
      prefixedS3 = new S3Data({
        client: { send: mockSend } as unknown as S3Client,
        bucket: "test-bucket",
        prefix: "tenant-a",
      });
    });

    it("prepends prefix to get requests", async () => {
      mockSend.mockResolvedValue({ Body: mockBody(FEAT_A), ETag: '"x"' });
      await prefixedS3.get("feature-a");

      expect(mockSend.mock.calls[0][0].input.Key).toBe("tenant-a/definitions/feature-a.json");
    });

    it("prepends prefix to list requests", async () => {
      mockSend.mockResolvedValue({ IsTruncated: false });
      await prefixedS3.listKeys();

      expect(mockSend.mock.calls[0][0].input.Prefix).toBe("tenant-a/definitions/");
    });

    it("strips prefix when extracting keys from list results", async () => {
      mockSend.mockResolvedValue({
        Contents: [{ Key: "tenant-a/definitions/feature-a.json" }],
        IsTruncated: false,
      });

      expect(await prefixedS3.listKeys()).toEqual(["feature-a"]);
    });

    it("prepends prefix to put requests", async () => {
      mockSend.mockResolvedValue({ ETag: '"x"' });
      await prefixedS3.put("feature-a", FEAT_A);

      expect(mockSend.mock.calls[0][0].input.Key).toBe("tenant-a/definitions/feature-a.json");
    });

    it("prepends prefix to preset requests", async () => {
      mockSend.mockResolvedValue({ Body: mockBody({}), ETag: '"x"' });
      await prefixedS3.getPresets();

      expect(mockSend.mock.calls[0][0].input.Key).toBe("tenant-a/presets/_default.json");
    });
  });
});

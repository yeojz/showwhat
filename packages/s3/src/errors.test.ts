import { describe, it, expect } from "vitest";
import { ShowwhatError } from "@showwhat/core";
import { S3StorageError, S3AuthError, S3ConflictError } from "./errors.js";

describe("S3StorageError", () => {
  it("extends ShowwhatError", () => {
    const err = new S3StorageError("something broke", 500);
    expect(err).toBeInstanceOf(ShowwhatError);
    expect(err).toBeInstanceOf(S3StorageError);
    expect(err.name).toBe("S3StorageError");
    expect(err.message).toBe("something broke");
    expect(err.status).toBe(500);
  });

  it("includes optional cause", () => {
    const cause = new Error("network");
    const err = new S3StorageError("failed", 502, cause);
    expect(err.cause).toBe(cause);
  });
});

describe("S3AuthError", () => {
  it("extends S3StorageError with status", () => {
    const err = new S3AuthError("bad creds", 403);
    expect(err).toBeInstanceOf(S3StorageError);
    expect(err).toBeInstanceOf(S3AuthError);
    expect(err.name).toBe("S3AuthError");
    expect(err.status).toBe(403);
  });
});

describe("S3ConflictError", () => {
  it("extends S3StorageError with key and status 412", () => {
    const err = new S3ConflictError("feature-x");
    expect(err).toBeInstanceOf(S3StorageError);
    expect(err).toBeInstanceOf(S3ConflictError);
    expect(err.name).toBe("S3ConflictError");
    expect(err.key).toBe("feature-x");
    expect(err.status).toBe(412);
    expect(err.message).toBe('Definition "feature-x" was modified externally since last read');
  });
});

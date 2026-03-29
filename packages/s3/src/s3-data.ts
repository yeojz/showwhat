import {
  type S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import type {
  Definition,
  Definitions,
  DefinitionData,
  PresetReader,
  Presets,
} from "@showwhat/core";
import { S3ConflictError, S3AuthError, S3StorageError } from "./errors.js";
import type { S3DataOptions } from "./types.js";

const DEFINITIONS_PREFIX = "definitions/";
const PRESETS_PREFIX = "presets/";
const JSON_EXT = ".json";
const DEFAULT_CONCURRENCY = 10;

export class S3Data implements DefinitionData, PresetReader {
  readonly #client: S3Client;
  readonly #bucket: string;
  readonly #prefix: string;
  readonly #etags = new Map<string, string>();

  constructor(options: S3DataOptions) {
    this.#client = options.client;
    this.#bucket = options.bucket;
    this.#prefix = options.prefix?.replace(/\/+$/, "") ?? "";
  }

  #fullKey(path: string): string {
    return this.#prefix ? `${this.#prefix}/${path}` : path;
  }

  #defPath(key: string): string {
    return `${DEFINITIONS_PREFIX}${key}${JSON_EXT}`;
  }

  #presetPath(key?: string): string {
    return `${PRESETS_PREFIX}${key ?? "_default"}${JSON_EXT}`;
  }

  #keyFromPath(objectKey: string): string {
    // Strip prefix if present, then strip definitions/ prefix and .json extension
    let path = objectKey;
    if (this.#prefix) {
      path = path.replace(new RegExp(`^${this.#prefix}/`), "");
    }
    return path.replace(new RegExp(`^${DEFINITIONS_PREFIX}`), "").replace(/\.json$/, "");
  }

  #isNotFound(err: unknown): boolean {
    const name = (err as { name?: string })?.name;
    return name === "NoSuchKey" || name === "NotFound";
  }

  #wrapError(err: unknown, key?: string): never {
    const metadata = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata;
    const status = metadata?.httpStatusCode;
    const message = err instanceof Error ? err.message : String(err);

    if (status === 401 || status === 403) {
      throw new S3AuthError(message, status);
    }
    if (status === 412 && key !== undefined) {
      throw new S3ConflictError(key);
    }
    throw new S3StorageError(message, status ?? 0, err);
  }

  async get(key: string): Promise<Definition | null> {
    const path = this.#defPath(key);
    try {
      const res = await this.#client.send(
        new GetObjectCommand({ Bucket: this.#bucket, Key: this.#fullKey(path) }),
      );
      const bodyStr = (await res.Body?.transformToString()) ?? "{}";
      const etag = res.ETag ?? "";
      if (etag) this.#etags.set(path, etag);
      return JSON.parse(bodyStr) as Definition;
    } catch (err) {
      if (this.#isNotFound(err)) return null;
      this.#wrapError(err);
    }
  }

  async getAll(): Promise<Definitions> {
    const objectKeys = await this.#listObjectKeys(DEFINITIONS_PREFIX);
    if (objectKeys.length === 0) return {};

    const definitions: Definitions = {};
    const chunks = this.#chunk(objectKeys, DEFAULT_CONCURRENCY);

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(async (objectKey) => {
          try {
            const res = await this.#client.send(
              new GetObjectCommand({ Bucket: this.#bucket, Key: objectKey }),
            );
            const bodyStr = (await res.Body?.transformToString()) ?? "{}";
            const etag = res.ETag ?? "";
            // Store etag keyed by the relative path (without prefix)
            const relativePath = this.#prefix
              ? objectKey.replace(new RegExp(`^${this.#prefix}/`), "")
              : objectKey;
            if (etag) this.#etags.set(relativePath, etag);
            return { objectKey, body: JSON.parse(bodyStr) as Definition };
          } catch (err) {
            if (this.#isNotFound(err)) return null;
            this.#wrapError(err);
          }
        }),
      );

      for (const result of results) {
        if (!result) continue;
        const key = this.#keyFromPath(result.objectKey);
        definitions[key] = result.body;
      }
    }

    return definitions;
  }

  async listKeys(): Promise<string[]> {
    const objectKeys = await this.#listObjectKeys(DEFINITIONS_PREFIX);
    return objectKeys.map((k) => this.#keyFromPath(k));
  }

  async put(key: string, definition: Definition): Promise<void> {
    const path = this.#defPath(key);
    const existingEtag = this.#etags.get(path);

    try {
      const res = await this.#client.send(
        new PutObjectCommand({
          Bucket: this.#bucket,
          Key: this.#fullKey(path),
          Body: JSON.stringify(definition),
          ContentType: "application/json",
          ...(existingEtag ? { IfMatch: existingEtag } : { IfNoneMatch: "*" }),
        }),
      );
      const newEtag = res.ETag ?? "";
      if (newEtag) this.#etags.set(path, newEtag);
    } catch (err) {
      this.#wrapError(err, key);
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.#defPath(key);
    try {
      await this.#client.send(
        new DeleteObjectCommand({ Bucket: this.#bucket, Key: this.#fullKey(path) }),
      );
      this.#etags.delete(path);
    } catch (err) {
      this.#wrapError(err);
    }
  }

  async putMany(flags: Definitions, options?: { replace?: boolean }): Promise<void> {
    const entries = Object.entries(flags);
    const chunks = this.#chunk(entries, DEFAULT_CONCURRENCY);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(([key, def]) =>
          options?.replace ? this.forcePut(key, def) : this.put(key, def),
        ),
      );
    }
  }

  async getPresets(key?: string): Promise<Presets> {
    const path = this.#presetPath(key);
    try {
      const res = await this.#client.send(
        new GetObjectCommand({ Bucket: this.#bucket, Key: this.#fullKey(path) }),
      );
      const bodyStr = (await res.Body?.transformToString()) ?? "{}";
      return JSON.parse(bodyStr) as Presets;
    } catch (err) {
      if (this.#isNotFound(err)) return {};
      this.#wrapError(err);
    }
  }

  async load(): Promise<void> {
    try {
      await this.#client.send(new HeadBucketCommand({ Bucket: this.#bucket }));
    } catch (err) {
      this.#wrapError(err);
    }
  }

  async close(): Promise<void> {
    // Stateless — no-op (user manages S3Client lifecycle)
  }

  async ping(): Promise<void> {
    await this.load();
  }

  async reload(): Promise<Definitions> {
    this.#etags.clear();
    return this.getAll();
  }

  async forcePut(key: string, definition: Definition): Promise<void> {
    const path = this.#defPath(key);
    try {
      const res = await this.#client.send(
        new PutObjectCommand({
          Bucket: this.#bucket,
          Key: this.#fullKey(path),
          Body: JSON.stringify(definition),
          ContentType: "application/json",
        }),
      );
      const newEtag = res.ETag ?? "";
      if (newEtag) this.#etags.set(path, newEtag);
    } catch (err) {
      this.#wrapError(err);
    }
  }

  async #listObjectKeys(prefix: string): Promise<string[]> {
    const allKeys: string[] = [];
    let continuationToken: string | undefined;

    do {
      try {
        const res = await this.#client.send(
          new ListObjectsV2Command({
            Bucket: this.#bucket,
            Prefix: this.#fullKey(prefix),
            ContinuationToken: continuationToken,
          }),
        );
        if (res.Contents) {
          for (const obj of res.Contents) {
            if (obj.Key) allKeys.push(obj.Key);
          }
        }
        continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
      } catch (err) {
        this.#wrapError(err);
      }
    } while (continuationToken);

    return allKeys;
  }

  #chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

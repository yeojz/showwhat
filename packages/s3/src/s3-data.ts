import type {
  Definition,
  Definitions,
  DefinitionData,
  PresetReader,
  Presets,
} from "@showwhat/core";
import { S3Client } from "./s3-client.js";
import { S3ConflictError, S3StorageError } from "./errors.js";
import type { S3DataOptions } from "./types.js";

const DEFINITIONS_PREFIX = "definitions/";
const PRESETS_PREFIX = "presets/";
const JSON_EXT = ".json";
const DEFAULT_CONCURRENCY = 10;

export class S3Data implements DefinitionData, PresetReader {
  readonly #client: S3Client;
  readonly #etags = new Map<string, string>();

  constructor(options: S3DataOptions) {
    this.#client = new S3Client(options);
  }

  #defPath(key: string): string {
    return `${DEFINITIONS_PREFIX}${key}${JSON_EXT}`;
  }

  #presetPath(key?: string): string {
    return `${PRESETS_PREFIX}${key ?? "_default"}${JSON_EXT}`;
  }

  #keyFromPath(path: string): string {
    return path
      .replace(new RegExp(`^${DEFINITIONS_PREFIX}`), "")
      .replace(new RegExp(`${JSON_EXT.replace(".", "\\.")}$`), "");
  }

  async get(key: string): Promise<Definition | null> {
    const path = this.#defPath(key);
    const result = await this.#client.getObject(path);
    if (!result) return null;

    if (result.etag) this.#etags.set(path, result.etag);
    return result.body as Definition;
  }

  async getAll(): Promise<Definitions> {
    const paths = await this.#client.listObjects(DEFINITIONS_PREFIX);
    if (paths.length === 0) return {};

    const definitions: Definitions = {};
    const chunks = this.#chunk(paths, DEFAULT_CONCURRENCY);

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(async (path) => {
          const result = await this.#client.getObject(path);
          return { path, result };
        }),
      );

      for (const { path, result } of results) {
        if (!result) continue;
        if (result.etag) this.#etags.set(path, result.etag);
        const key = this.#keyFromPath(path);
        definitions[key] = result.body as Definition;
      }
    }

    return definitions;
  }

  async listKeys(): Promise<string[]> {
    const paths = await this.#client.listObjects(DEFINITIONS_PREFIX);
    return paths.map((p) => this.#keyFromPath(p));
  }

  async put(key: string, definition: Definition): Promise<void> {
    const path = this.#defPath(key);
    const existingEtag = this.#etags.get(path);

    try {
      const newEtag = await this.#client.putObject(
        path,
        definition,
        existingEtag ? { etag: existingEtag } : { ifNoneMatch: true },
      );
      this.#etags.set(path, newEtag);
    } catch (err) {
      if (err instanceof S3StorageError && err.status === 412) {
        throw new S3ConflictError(key);
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.#defPath(key);
    await this.#client.deleteObject(path);
    this.#etags.delete(path);
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
    const result = await this.#client.getObject(path);
    if (!result) return {};
    return result.body as Presets;
  }

  async load(): Promise<void> {
    await this.#client.headBucket();
  }

  async close(): Promise<void> {
    // Stateless HTTP — no-op
  }

  async ping(): Promise<void> {
    await this.#client.headBucket();
  }

  async reload(): Promise<Definitions> {
    this.#etags.clear();
    return this.getAll();
  }

  async forcePut(key: string, definition: Definition): Promise<void> {
    const path = this.#defPath(key);
    const newEtag = await this.#client.putObject(path, definition);
    this.#etags.set(path, newEtag);
  }

  #chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

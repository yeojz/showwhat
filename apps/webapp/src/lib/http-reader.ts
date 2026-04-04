import yaml from "js-yaml";
import { parseYaml, parseObject, DefinitionSchema, PresetsSchema } from "showwhat";
import type { DefinitionReader, PresetReader } from "showwhat";
import type { Definitions, Definition } from "showwhat";
import type { Presets } from "showwhat";
import type { SingleSource, KeyedSource, RemoteSource } from "../store/source-store.js";

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 30_000;

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type SourceFetchResult = {
  definitions: Definitions;
  /** Presets from a dedicated presetsUrl endpoint (keyed mode) or from file (single mode). */
  presets?: Presets;
  /**
   * Per-definition-key presets for keyed mode. Each entry maps a definition
   * key to the presets found in that key's file.
   */
  definitionPresets?: Record<string, Presets>;
  keys: string[];
  failedKeys?: string[];
};

export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function formatFetchError(err: unknown): string {
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return "Network error — this is often caused by missing CORS headers on the server. Check your S3/R2 bucket CORS configuration.";
  }
  return err instanceof Error ? err.message : "Failed to fetch source";
}

function filterDangerousKeys<T>(record: Record<string, T>): Record<string, T> {
  const filtered: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!DANGEROUS_KEYS.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

async function safeFetch(url: string, headers?: Record<string, string>): Promise<string> {
  if (!isAllowedUrl(url)) {
    throw new Error("URL must use HTTPS (or localhost for development)");
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
    throw new Error("Response too large (exceeds 5 MB limit)");
  }

  const text = await response.text();
  if (text.length > MAX_RESPONSE_BYTES) {
    throw new Error("Response too large (exceeds 5 MB limit)");
  }

  return text;
}

function parseText(text: string, format: "yaml" | "json"): unknown {
  if (format === "json") return JSON.parse(text);
  return yaml.load(text);
}

async function fetchPresetsFromUrl(
  url: string,
  format: "yaml" | "json",
  headers?: Record<string, string>,
): Promise<Presets | undefined> {
  const text = await safeFetch(url, headers);
  const raw = parseText(text, format);

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  const presetsData = obj.presets;
  if (!presetsData) return undefined;

  const result = PresetsSchema.safeParse(presetsData);
  return result.success ? result.data : undefined;
}

export class SingleSourceHttpReader implements DefinitionReader, PresetReader {
  readonly #source: SingleSource;

  constructor(source: SingleSource) {
    this.#source = source;
  }

  async fetchSource(): Promise<SourceFetchResult> {
    const text = await safeFetch(this.#source.url, this.#source.headers);
    const fileFormat =
      this.#source.format === "json" ? await parseObject(JSON.parse(text)) : await parseYaml(text);

    const definitions = filterDangerousKeys(fileFormat.definitions) as Definitions;

    return {
      definitions,
      presets: fileFormat.presets,
      keys: Object.keys(definitions),
    };
  }

  async getAll(): Promise<Definitions> {
    const result = await this.fetchSource();
    return result.definitions;
  }

  async get(key: string): Promise<Definition | null> {
    const defs = await this.getAll();
    return defs[key] ?? null;
  }

  async listKeys(): Promise<string[]> {
    const result = await this.fetchSource();
    return result.keys;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getPresets(_key?: string): Promise<Presets> {
    const result = await this.fetchSource();
    return result.presets ?? {};
  }
}

export class KeyedSourceHttpReader implements DefinitionReader, PresetReader {
  readonly #source: KeyedSource;

  constructor(source: KeyedSource) {
    this.#source = source;
  }

  async fetchDefinitionKey(
    key: string,
  ): Promise<{ definition: Definition; filePresets?: Presets }> {
    const url = this.#source.baseUrl + encodeURIComponent(key);
    const text = await safeFetch(url, this.#source.headers);
    const raw = parseText(text, this.#source.format);

    let filePresets: Presets | undefined;
    if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
      const maybePresets = PresetsSchema.safeParse((raw as Record<string, unknown>).presets);
      if (maybePresets.success) filePresets = maybePresets.data;
    }

    const result = DefinitionSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(
        `Invalid definition for "${key}": ${result.error.issues.map((i: { message: string }) => i.message).join(", ")}`,
      );
    }
    return { definition: result.data, filePresets };
  }

  async fetchPresets(
    url: string,
    format: "yaml" | "json",
    headers?: Record<string, string>,
  ): Promise<Presets | undefined> {
    return fetchPresetsFromUrl(url, format, headers);
  }

  async fetchSource(): Promise<SourceFetchResult> {
    const keys = this.#source.definitionKeys.filter((k) => !DANGEROUS_KEYS.has(k));

    if (keys.length === 0) {
      throw new Error("No definition keys configured");
    }

    const definitions: Record<string, Definition> = {};
    const failedKeys: string[] = [];
    const definitionPresetsMap: Record<string, Presets> = {};

    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const fetched = await this.fetchDefinitionKey(key);
        return { key, ...fetched };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        definitions[result.value.key] = result.value.definition;
        if (result.value.filePresets) {
          definitionPresetsMap[result.value.key] = result.value.filePresets;
        }
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        const match = msg.match(/Invalid definition for "(.+?)"/);
        failedKeys.push(match?.[1] ?? "unknown");
      }
    }

    if (Object.keys(definitions).length === 0) {
      throw new Error("All definition fetches failed");
    }

    let presets: Presets | undefined;
    if (this.#source.presetsUrl) {
      presets = await fetchPresetsFromUrl(
        this.#source.presetsUrl,
        this.#source.format,
        this.#source.headers,
      );
    }

    return {
      definitions: definitions as Definitions,
      presets,
      definitionPresets:
        Object.keys(definitionPresetsMap).length > 0 ? definitionPresetsMap : undefined,
      keys: Object.keys(definitions),
      failedKeys,
    };
  }

  async getAll(): Promise<Definitions> {
    const keys = this.#source.definitionKeys.filter((k) => !DANGEROUS_KEYS.has(k));

    if (keys.length === 0) {
      throw new Error("No definition keys configured");
    }

    const definitions: Record<string, Definition> = {};

    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const fetched = await this.fetchDefinitionKey(key);
        return { key, definition: fetched.definition };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        definitions[result.value.key] = result.value.definition;
      }
    }

    if (Object.keys(definitions).length === 0) {
      throw new Error("All definition fetches failed");
    }

    return definitions as Definitions;
  }

  async get(key: string): Promise<Definition | null> {
    const fetched = await this.fetchDefinitionKey(key);
    return fetched.definition;
  }

  async listKeys(): Promise<string[]> {
    if (!this.#source.listUrl) {
      return this.#source.definitionKeys;
    }

    const text = await safeFetch(this.#source.listUrl, this.#source.headers);
    const raw: unknown = parseText(text, this.#source.format);

    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error('List endpoint must return an object with a "definitionKeys" array');
    }

    const obj = raw as Record<string, unknown>;
    const keys = obj.definitionKeys;

    if (!Array.isArray(keys) || !keys.every((k) => typeof k === "string" && k.length > 0)) {
      throw new Error(
        'List endpoint must return an object with a "definitionKeys" array of non-empty strings',
      );
    }

    return (keys as string[]).filter((k) => !DANGEROUS_KEYS.has(k));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getPresets(_key?: string): Promise<Presets> {
    if (!this.#source.presetsUrl) {
      return {};
    }
    const presets = await fetchPresetsFromUrl(
      this.#source.presetsUrl,
      this.#source.format,
      this.#source.headers,
    );
    return presets ?? {};
  }
}

export function createHttpReader(
  source: RemoteSource,
): SingleSourceHttpReader | KeyedSourceHttpReader {
  if (source.mode === "single") {
    return new SingleSourceHttpReader(source);
  }
  return new KeyedSourceHttpReader(source);
}

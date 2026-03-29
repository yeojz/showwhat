import { parseObject, parseYaml } from "./parsers.js";
import type { Definitions, Definition } from "./schemas/index.js";
import type { Presets } from "./schemas/index.js";

export interface DefinitionReader {
  get(key: string): Promise<Definition | null>;
  getAll(): Promise<Definitions>;
  listKeys(): Promise<string[]>;
  load?(): Promise<void>;
  close?(): Promise<void>;
  ping?(): Promise<void>;
}

export interface DefinitionWriter {
  put(key: string, definition: Definition): Promise<void>;
  delete(key: string): Promise<void>;
  putMany(flags: Definitions, options?: { replace?: boolean }): Promise<void>;
  load?(): Promise<void>;
  close?(): Promise<void>;
  ping?(): Promise<void>;
}

export interface DefinitionData extends DefinitionReader, DefinitionWriter {}

export interface PresetReader {
  getPresets(): Promise<Presets>;
  getPresets(key: string): Promise<Presets>;
}

function hasMethod(obj: object, key: string): boolean {
  return key in obj && typeof (obj as Record<string, unknown>)[key] === "function";
}

export function isWritable(reader: DefinitionReader): reader is DefinitionData {
  return hasMethod(reader, "put") && hasMethod(reader, "delete") && hasMethod(reader, "putMany");
}

export class MemoryData implements DefinitionReader, PresetReader {
  #flags: Definitions;
  #presets: Presets;

  private constructor(flags: Definitions, presets: Presets) {
    this.#flags = flags;
    this.#presets = presets;
  }

  static async fromObject(raw: unknown): Promise<MemoryData> {
    const fileFormat = await parseObject(raw);
    return new MemoryData(fileFormat.definitions, fileFormat.presets ?? {});
  }

  static async fromYaml(yaml: string): Promise<MemoryData> {
    const fileFormat = await parseYaml(yaml);
    return new MemoryData(fileFormat.definitions, fileFormat.presets ?? {});
  }

  async get(key: string): Promise<Definition | null> {
    const def = this.#flags[key];
    if (def === undefined) {
      return null;
    }
    return structuredClone(def);
  }

  async getAll(): Promise<Definitions> {
    return structuredClone(this.#flags);
  }

  async listKeys(): Promise<string[]> {
    return Object.keys(this.#flags);
  }

  async getPresets(): Promise<Presets> {
    return structuredClone(this.#presets);
  }
}

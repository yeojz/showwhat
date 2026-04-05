import yaml from "js-yaml";
import { FileFormatSchema } from "./schemas/index.js";
import { ParseError, SchemaValidationError } from "./errors.js";
import type { FileFormat } from "./schemas/index.js";
import { PresetsSchema } from "./schemas/index.js";
import type { Presets } from "./schemas/index.js";

function loadYaml(input: string): unknown {
  try {
    return yaml.load(input);
  } catch (e: unknown) {
    const err = e as Error;
    const line = (e as yaml.YAMLException)?.mark?.line;

    throw new ParseError(`YAML: ${err.message}`, line);
  }
}

function assertPlainObject(raw: unknown, label: string): asserts raw is Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ParseError(label);
  }
}

export async function parseYaml(input: string): Promise<FileFormat> {
  const raw = loadYaml(input);
  assertPlainObject(raw, "YAML: Unknown structure at the root level");

  return await parseObject(raw);
}

export async function parseObject(raw: unknown): Promise<FileFormat> {
  const result = FileFormatSchema.safeParse(raw);

  if (!result.success) {
    throw new SchemaValidationError(result.error, "flags");
  }

  return result.data;
}

export async function parsePresetsObject(raw: unknown): Promise<Presets> {
  assertPlainObject(raw, "Expected object with presets key");
  const result = PresetsSchema.safeParse(raw.presets ?? {});

  if (!result.success) {
    throw new SchemaValidationError(result.error, "presets");
  }

  return result.data;
}

export async function parsePresetsYaml(input: string): Promise<Presets> {
  return parsePresetsObject(loadYaml(input));
}

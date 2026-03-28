import { z } from "zod";
import { PRIMITIVE_CONDITION_TYPES } from "./condition.js";

export type PresetDefinition = {
  type: string;
  key?: string;
  defaults?: Record<string, unknown>;
};

export type Presets = Record<string, PresetDefinition>;

export const PRIMITIVE_TYPES = new Set<string>(Object.values(PRIMITIVE_CONDITION_TYPES));

const PresetDefinitionSchema = z
  .object({
    type: z.string().min(1),
    key: z.string().min(1).optional(),
    defaults: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    if (PRIMITIVE_TYPES.has(val.type) && !val.key) {
      ctx.addIssue({
        code: "custom",
        message: `"key" is required when type is a built-in preset type ("${val.type}")`,
        path: ["key"],
      });
    }
  });

export const PresetsSchema = z.record(z.string(), PresetDefinitionSchema);

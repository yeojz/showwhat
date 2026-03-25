import { z } from "zod";
import { VariationSchema } from "./variation.js";
import { PresetsSchema } from "./preset.js";

export const DefinitionSchema = z.object({
  id: z.string().optional(),
  active: z.boolean().optional(),
  description: z.string().optional(),
  variations: z.array(VariationSchema).min(1),
});
export type Definition = z.infer<typeof DefinitionSchema>;

export const DefinitionsSchema = z.record(z.string().min(1), DefinitionSchema);
export type Definitions = z.infer<typeof DefinitionsSchema>;

export const FileFormatSchema = z
  .object({
    definitions: DefinitionsSchema,
    presets: PresetsSchema.optional(),
  })
  .strict();

export type FileFormat = z.infer<typeof FileFormatSchema>;

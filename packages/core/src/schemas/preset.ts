import { z } from "zod";
import { PRIMITIVE_CONDITION_TYPES, ConditionSchema } from "./condition.js";

export type PresetDefinition = {
  type: string;
  key?: string;
  overrides?: Record<string, unknown>;
};

export type Presets = Record<string, PresetDefinition>;

const PRIMITIVE_TYPES = new Set<string>(Object.values(PRIMITIVE_CONDITION_TYPES));
const COMPOSITE_TYPES = new Set<string>(["and", "or", "matchAnnotations"]);

const PresetDefinitionSchema = z
  .object({
    type: z.string().min(1),
    key: z.string().min(1).optional(),
    overrides: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    if (PRIMITIVE_TYPES.has(val.type) && !val.key) {
      ctx.addIssue({
        code: "custom",
        message: `"key" is required when type is a built-in preset type ("${val.type}")`,
        path: ["key"],
      });
    }
    if (COMPOSITE_TYPES.has(val.type)) {
      const conditions = val.overrides?.conditions;

      if (!Array.isArray(conditions) || conditions.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: `"overrides.conditions" must be a non-empty array for composite type ("${val.type}")`,
          path: ["overrides", "conditions"],
        });

        return;
      }

      for (let i = 0; i < conditions.length; i++) {
        const result = ConditionSchema.safeParse(conditions[i]);

        if (!result.success) {
          for (const issue of result.error.issues) {
            ctx.addIssue({
              ...issue,
              path: ["overrides", "conditions", i, ...issue.path],
            });
          }
        }
      }
    }
  });

export const PresetsSchema = z.record(z.string(), PresetDefinitionSchema);

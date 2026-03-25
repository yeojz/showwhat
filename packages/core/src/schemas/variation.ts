import { z } from "zod";
import { ConditionSchema } from "./condition.js";

export type VariationValue = unknown;
export const VariationValueSchema: z.ZodType<VariationValue> = z.unknown();

export const VariationSchema = z.object({
  id: z.string().optional(),
  value: VariationValueSchema,
  conditions: z.array(ConditionSchema).optional(),
  description: z.string().optional(),
});
export type Variation = z.infer<typeof VariationSchema>;

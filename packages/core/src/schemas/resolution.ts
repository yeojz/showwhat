import { z } from "zod";
import { ContextSchema } from "./context.js";
import { VariationValueSchema } from "./variation.js";

export const ResolutionSchema = z.object({
  key: z.string(),
  value: VariationValueSchema,
  meta: z.object({
    context: ContextSchema,
    variation: z.object({
      index: z.number().int().nonnegative(),
      id: z.string().optional(),
      description: z.string().optional(),
      conditionCount: z.number().int().nonnegative(),
    }),
    annotations: z.record(z.string(), z.unknown()),
  }),
});

type BaseResolution = z.infer<typeof ResolutionSchema>;

export type Resolution<V = unknown> = Omit<BaseResolution, "value"> & { value: V };

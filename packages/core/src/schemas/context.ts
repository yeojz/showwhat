import { z } from "zod";

const ContextPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

const ContextValueSchema: z.ZodType<ContextValue> = z.union([
  ContextPrimitiveSchema,
  z.array(ContextPrimitiveSchema),
  z.lazy(() => z.record(z.string(), ContextValueSchema)),
]);

export const ContextSchema = z.record(z.string(), ContextValueSchema);

type ContextPrimitive = string | number | boolean;
type ContextValue = ContextPrimitive | ContextPrimitive[] | { [key: string]: ContextValue };
export type Context = Record<string, ContextValue>;

import { z } from "zod";

const DataPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

/**
 * Primitive values inferred from the schema — string | number | boolean.
 */
type DataPrimitive = z.infer<typeof DataPrimitiveSchema>;

/**
 * The set of value types that showwhat's data model understands.
 *
 * Used as the structural base for both `ContextValue` and `AnnotationValue`.
 *
 * **Why this isn't `z.infer`:** TypeScript cannot infer recursive types from
 * self-referencing `const` declarations (TS7022). The schema below must be
 * annotated with this type; `DataPrimitive` is still inferred from its schema,
 * keeping the non-recursive portion derived from the single source of truth.
 */
export type DataValue = DataPrimitive | DataPrimitive[] | { [key: string]: DataValue };

export const DataValueSchema: z.ZodType<DataValue> = z.union([
  DataPrimitiveSchema,
  z.array(DataPrimitiveSchema),
  z.lazy(() => z.record(z.string(), DataValueSchema)),
]);

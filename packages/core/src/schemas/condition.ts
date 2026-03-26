import { z } from "zod";

// ── Constants ─────────────────────────────────────────────────────────────────

export const PRIMITIVE_CONDITION_TYPES = {
  string: "string",
  number: "number",
  bool: "bool",
  datetime: "datetime",
} as const;

export type PrimitiveConditionType =
  (typeof PRIMITIVE_CONDITION_TYPES)[keyof typeof PRIMITIVE_CONDITION_TYPES];

export const CONDITION_TYPES = {
  ...PRIMITIVE_CONDITION_TYPES,
  env: "env",
  startAt: "startAt",
  endAt: "endAt",
  and: "and",
  or: "or",
} as const;

export const CONTEXT_KEYS = {
  env: "env",
  at: "at",
} as const;

// ── Primitive condition schemas ──────────────────────────────────────────────

export const StringConditionSchema = z
  .object({
    id: z.string().optional(),
    type: z.literal("string"),
    key: z.string().min(1),
    op: z.enum(["eq", "neq", "in", "nin", "regex"]),
    value: z.union([z.string(), z.array(z.string())]),
  })
  .superRefine((val, ctx) => {
    const isArrayOp = val.op === "in" || val.op === "nin";
    const isArray = Array.isArray(val.value);
    if (isArrayOp && !isArray) {
      ctx.addIssue({
        code: "custom",
        message: `"${val.op}" operator requires an array value`,
        path: ["value"],
      });
    }
    if (!isArrayOp && isArray) {
      ctx.addIssue({
        code: "custom",
        message: `"${val.op}" operator requires a string value`,
        path: ["value"],
      });
    }
  });
export type StringCondition = z.infer<typeof StringConditionSchema>;

export const NumberConditionSchema = z
  .object({
    id: z.string().optional(),
    type: z.literal("number"),
    key: z.string().min(1),
    op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "nin"]),
    value: z.union([z.number(), z.array(z.number())]),
  })
  .superRefine((val, ctx) => {
    const isArrayOp = val.op === "in" || val.op === "nin";
    const isArray = Array.isArray(val.value);
    if (isArrayOp && !isArray) {
      ctx.addIssue({
        code: "custom",
        message: `"${val.op}" operator requires an array value`,
        path: ["value"],
      });
    }
    if (!isArrayOp && isArray) {
      ctx.addIssue({
        code: "custom",
        message: `"${val.op}" operator requires a number value`,
        path: ["value"],
      });
    }
  });
export type NumberCondition = z.infer<typeof NumberConditionSchema>;

export const DatetimeConditionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("datetime"),
  key: z.string().min(1),
  op: z.enum(["eq", "gt", "gte", "lt", "lte"]),
  value: z.iso.datetime({ message: '"datetime" must be a valid ISO 8601 datetime' }),
});
export type DatetimeCondition = z.infer<typeof DatetimeConditionSchema>;

export const BoolConditionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("bool"),
  key: z.string().min(1),
  op: z.literal("eq").optional(),
  value: z.boolean(),
});
export type BoolCondition = z.infer<typeof BoolConditionSchema>;

// ── Sugar condition schemas ──────────────────────────────────────────────────

export const EnvConditionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("env"),
  op: z.literal("eq").optional(),
  value: z.union([z.string(), z.array(z.string())]),
});
export type EnvCondition = z.infer<typeof EnvConditionSchema>;

export const StartAtConditionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("startAt"),
  value: z.iso.datetime({ message: '"startAt" must be a valid ISO 8601 datetime' }),
});
export type StartAtCondition = z.infer<typeof StartAtConditionSchema>;

export const EndAtConditionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("endAt"),
  value: z.iso.datetime({ message: '"endAt" must be a valid ISO 8601 datetime' }),
});
export type EndAtCondition = z.infer<typeof EndAtConditionSchema>;

// ── Built-in union ────────────────────────────────────────────────────────────

export const BuiltinConditionSchema = z.discriminatedUnion("type", [
  StringConditionSchema,
  NumberConditionSchema,
  DatetimeConditionSchema,
  BoolConditionSchema,
  EnvConditionSchema,
  StartAtConditionSchema,
  EndAtConditionSchema,
]);
export type BuiltinCondition = z.infer<typeof BuiltinConditionSchema>;

// ── Condition (explicit recursive type) ──────────────────────────────────────

export type Condition =
  | BuiltinCondition
  | { id?: string; type: "and"; conditions: Condition[] }
  | { id?: string; type: "or"; conditions: Condition[] }
  | { type: string; [key: string]: unknown };

// ── Composite schemas ─────────────────────────────────────────────────────────
// z.lazy is safe here: all schemas are in this file, so ConditionSchema
// is defined before any .parse() call occurs.

const AndConditionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("and"),
  conditions: z.array(z.lazy(() => ConditionSchema)).min(1),
});
const OrConditionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("or"),
  conditions: z.array(z.lazy(() => ConditionSchema)).min(1),
});

// All built-in and composite types must not pass through the open-union custom-condition arm.
const BLOCKED_OPEN_UNION_TYPES = new Set<string>(Object.values(CONDITION_TYPES));

// ── ConditionSchema ───────────────────────────────────────────────────────────
// z.ZodType<Condition> annotation is required for the recursive schema.

export const ConditionSchema: z.ZodType<Condition> = z
  .union([
    BuiltinConditionSchema,
    AndConditionSchema,
    OrConditionSchema,
    z.looseObject({ type: z.string() }).refine((val) => !BLOCKED_OPEN_UNION_TYPES.has(val.type), {
      message: "Reserved condition type",
    }),
  ])
  .superRefine((val, ctx) => {
    // Defense-in-depth: catches edge cases like catastrophic backtracking patterns that pass schema format validation
    if (val.type === CONDITION_TYPES.string) {
      const sc = val as StringCondition;
      if (sc.op === "regex") {
        try {
          new RegExp(sc.value as string);
        } catch (e) {
          ctx.addIssue({
            code: "custom",
            message: `Invalid regex pattern "${sc.value}": ${(e as Error).message}`,
            path: ["value"],
          });
        }
      }
    }
  });

// ── Composite types (inferred after schema is defined) ────────────────────────

export type AndCondition = z.infer<typeof AndConditionSchema>;
export type OrCondition = z.infer<typeof OrConditionSchema>;
export type CompositeCondition = AndCondition | OrCondition;

// ── Type guards ───────────────────────────────────────────────────────────────

export function isAndCondition(c: Condition): c is AndCondition {
  return c.type === CONDITION_TYPES.and;
}
export function isOrCondition(c: Condition): c is OrCondition {
  return c.type === CONDITION_TYPES.or;
}

import type { EvaluationContext } from "@openfeature/server-sdk";
import type { Context } from "@showwhat/core";

/**
 * Flattens an OpenFeature EvaluationContext into a showwhat Context.
 *
 * showwhat Context only supports `Record<string, string | number | boolean>`,
 * so nested objects, arrays, dates, and null values are dropped.
 * The `targetingKey` is mapped to the `targetingKey` context property.
 */
export function toShowwhatContext(evalCtx: EvaluationContext): Context {
  const ctx: Context = {};

  for (const [key, value] of Object.entries(evalCtx)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      ctx[key] = value;
    }
  }

  return ctx;
}

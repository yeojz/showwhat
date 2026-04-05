import type { EvaluationContext, EvaluationContextValue } from "@openfeature/server-sdk";
import type { Context, ContextValue, Logger } from "showwhat";
import { noopLogger } from "showwhat";

/**
 * Converts an OpenFeature EvaluationContextValue to a showwhat ContextValue.
 *
 * Primitives, primitive arrays, and nested objects of primitives are preserved.
 * Date and null values are not representable in JSON/YAML and are dropped.
 */
function convertValue(value: EvaluationContextValue): ContextValue | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const result: (string | number | boolean)[] = [];
    for (const item of value) {
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
        result.push(item);
      } else {
        return undefined;
      }
    }

    return result;
  }

  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    const result: Record<string, ContextValue> = {};
    for (const [k, v] of Object.entries(value)) {
      const converted = convertValue(v);

      if (converted === undefined) {
        return undefined;
      }

      result[k] = converted;
    }
    return result;
  }

  return undefined;
}

/**
 * Converts an OpenFeature EvaluationContext into a showwhat Context.
 *
 * Primitives, primitive arrays, and nested objects of primitives are preserved.
 * Date and null values are dropped with a warning.
 */
export function toShowwhatContext(evalCtx: EvaluationContext, logger?: Logger): Context {
  const log = logger ?? noopLogger;
  const ctx: Context = {};

  for (const [key, value] of Object.entries(evalCtx)) {
    const converted = convertValue(value);

    if (converted !== undefined) {
      ctx[key] = converted;
    } else {
      log.warn("dropped unsupported context key", { key });
    }
  }

  return ctx;
}

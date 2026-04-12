import type { Condition } from "showwhat";
import {
  buildAndCondition,
  buildOrCondition,
  buildCheckAnnotationsCondition,
  buildCustomCondition,
} from "./condition-builders.js";
import { BUILTIN_CONDITION_TYPES } from "./condition-registry.js";
import type { ConditionTypeMeta } from "./condition-registry.js";

export {
  buildAndCondition,
  buildOrCondition,
  buildCheckAnnotationsCondition,
  buildCustomCondition,
};

/**
 * Build a default condition for a given type string.
 * Returns the correct narrowed type for composite conditions,
 * and uses schema-derived defaults for built-in leaf conditions.
 */
export function buildDefaultCondition(
  type: string,
  id?: string,
  extraTypes?: ConditionTypeMeta[],
): Condition {
  if (type === "and") {
    return buildAndCondition([], id);
  }
  if (type === "or") {
    return buildOrCondition([], id);
  }
  if (type === "checkAnnotations") {
    return buildCheckAnnotationsCondition([], id);
  }
  if (type === "__custom") {
    return buildCustomCondition({ type: "", ...(id ? { id } : {}) });
  }
  const meta =
    BUILTIN_CONDITION_TYPES.find((m) => m.type === type) ??
    extraTypes?.find((m) => m.type === type);
  if (meta) {
    return buildCustomCondition({
      ...meta.defaults,
      type: meta.type,
      ...(id ? { id } : {}),
    });
  }
  return buildCustomCondition({ type: "", ...(id ? { id } : {}) });
}

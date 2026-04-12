import type { Condition, AndCondition, OrCondition, CheckAnnotationsCondition } from "showwhat";

/** Build an AND composite condition. */
export function buildAndCondition(conditions: Condition[], id?: string): AndCondition {
  return id ? { id, type: "and", conditions } : { type: "and", conditions };
}

/** Build an OR composite condition. */
export function buildOrCondition(conditions: Condition[], id?: string): OrCondition {
  return id ? { id, type: "or", conditions } : { type: "or", conditions };
}

/** Build a checkAnnotations composite condition. */
export function buildCheckAnnotationsCondition(
  conditions: Condition[],
  id?: string,
): CheckAnnotationsCondition {
  return id
    ? { id, type: "checkAnnotations", conditions }
    : { type: "checkAnnotations", conditions };
}

/**
 * Build an open-union (custom) condition with an arbitrary type string.
 * Matches the `{ type: string; [key: string]: unknown }` arm of the Condition union.
 */
export function buildCustomCondition(fields: { type: string; [key: string]: unknown }): Condition {
  return fields;
}

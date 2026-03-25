import type { ValidationIssueDisplay } from "../types.js";

/**
 * Filter validation errors for a specific child at `path[0] === pathKey && path[1] === index`,
 * then strip those two leading segments so the child sees only its own errors.
 */
export function filterErrorsByPath(
  errors: ValidationIssueDisplay[] | undefined,
  pathKey: string,
  index: number,
): ValidationIssueDisplay[] | undefined {
  if (!errors) return undefined;
  const filtered = errors.filter((err) => err.path[0] === pathKey && err.path[1] === index);
  if (filtered.length === 0) return undefined;
  return filtered.map((err) => ({ ...err, path: err.path.slice(2) }));
}

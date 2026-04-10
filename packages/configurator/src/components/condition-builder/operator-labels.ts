/**
 * Centralized operator label definitions.
 *
 * Each editor picks the subset it supports — the labels themselves are
 * defined once here so every condition type uses the same wording.
 */

export type OperatorOption = {
  value: string;
  label: string;
  /** Short code shown in parentheses in the dropdown, e.g. "eq" */
  code?: string;
};

/** Canonical label for every operator code. */
const LABEL: Record<string, string> = {
  eq: "equals",
  neq: "not equals",
  gt: "more than",
  gte: "at least",
  lt: "less than",
  lte: "at most",
  in: "one of",
  nin: "not one of",
  regex: "matches",
};

/** Build an OperatorOption from a code, using the canonical label. */
function op(code: string): OperatorOption {
  return { value: code, label: LABEL[code] ?? code, code };
}

// ── Per-type option lists (subsets of the canonical labels) ─────────

export const STRING_OPS: OperatorOption[] = [op("eq"), op("neq"), op("in"), op("nin"), op("regex")];

export const NUMBER_OPS: OperatorOption[] = [
  op("eq"),
  op("neq"),
  op("gt"),
  op("gte"),
  op("lt"),
  op("lte"),
  op("in"),
  op("nin"),
];

export const DATETIME_OPS: OperatorOption[] = [op("eq"), op("gt"), op("gte"), op("lt"), op("lte")];

export const BOOL_OPS: OperatorOption[] = [op("eq")];

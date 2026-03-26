import type { Condition } from "showwhat";
import { isAndCondition, isOrCondition } from "showwhat";
import { getConditionMeta } from "../components/condition-builder/condition-registry.js";

function formatLeafOperator(c: Condition): { op: string; val: string } {
  const opField = "op" in c ? String(c.op) : "";
  const raw = "value" in c ? c.value : "";

  // Operator symbol mapping
  const opSymbols: Record<string, string> = {
    eq: "=",
    neq: "!=",
    in: "in",
    nin: "not in",
    regex: "~",
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
  };
  const opSymbol = opSymbols[opField] ?? "=";

  if (c.type === "string" || c.type === "env") {
    const vals = Array.isArray(raw) ? raw.map(String) : [String(raw)];
    if (opField === "regex") {
      return { op: "~", val: vals.map((v) => `/${v}/`).join(", ") };
    }
    return { op: opSymbol, val: vals.map((v) => `"${v}"`).join(", ") };
  }

  if (c.type === "number") {
    if (Array.isArray(raw)) {
      return { op: opSymbol, val: raw.map(String).join(", ") };
    }
    return { op: opSymbol, val: String(raw) };
  }

  if (c.type === "bool") {
    return { op: "=", val: String(raw) };
  }

  if (c.type === "datetime") {
    return { op: opSymbol, val: `"${String(raw)}"` };
  }

  if (c.type === "startAt") return { op: ">=", val: `"${String(raw)}"` };
  if (c.type === "endAt") return { op: "<", val: `"${String(raw)}"` };

  // Fallback for custom types
  const value = raw ? String(raw) : "";
  return { op: "=", val: value ? `"${value}"` : "" };
}

function formatOne(c: Condition, indent: number): string[] {
  const prefix = "  ".repeat(indent);
  if (isAndCondition(c)) {
    if (c.conditions.length === 0) return [`${prefix}(empty AND group)`];
    const lines: string[] = [];
    c.conditions.forEach((sub, i) => {
      const subLines = formatOne(sub, indent + 1);
      if (i > 0) lines.push(`${prefix}  AND`);
      lines.push(...subLines);
    });
    return [`${prefix}(`, ...lines, `${prefix})`];
  }
  if (isOrCondition(c)) {
    if (c.conditions.length === 0) return [`${prefix}(empty OR group)`];
    const lines: string[] = [];
    c.conditions.forEach((sub, i) => {
      const subLines = formatOne(sub, indent + 1);
      if (i > 0) lines.push(`${prefix}  OR`);
      lines.push(...subLines);
    });
    return [`${prefix}(`, ...lines, `${prefix})`];
  }
  const meta = getConditionMeta(c.type);
  const label = meta?.label ?? c.type;
  const { op, val } = formatLeafOperator(c);
  const key = "key" in c ? String(c.key) : "";
  if (key && val) return [`${prefix}${key} ${op} ${val}`];
  if (val) return [`${prefix}${label} ${op} ${val}`];
  return [`${prefix}${label}`];
}

export function formatConditionSummary(conditions: Condition[]): string | null {
  if (conditions.length === 0) return null;
  const lines: string[] = [];
  conditions.forEach((c, i) => {
    if (i > 0) lines.push("  AND");
    lines.push(...formatOne(c, 1));
  });
  return `When ${lines.join("\n").trimStart()}`;
}

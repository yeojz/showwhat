import { useCallback, useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { KeyInput } from "./KeyInput.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { Input } from "../ui/input.js";
import { buildCustomCondition } from "./condition-builders.js";

export const OP_OPTIONS = [
  { value: "eq", label: "eq" },
  { value: "neq", label: "neq" },
  { value: "gt", label: "gt" },
  { value: "gte", label: "gte" },
  { value: "lt", label: "lt" },
  { value: "lte", label: "lte" },
];

export const meta = {
  type: "number",
  label: "Number",
  description: "Compare a context key against a number",
  defaults: { type: "number", key: "", op: "eq", value: 0 },
};

export function NumberConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
  const rec = useMemo(() => condition as Record<string, unknown>, [condition]);
  const update = useCallback(
    (field: string, value: unknown) => {
      onChange(buildCustomCondition({ ...rec, [field]: value, type: "number" }));
    },
    [rec, onChange],
  );

  return (
    <ConditionRow>
      <KeyInput
        value={String(rec.key ?? "")}
        onChange={(v) => update("key", v)}
        placeholder="e.g. score"
      />
      <OperatorSelect
        value={String(rec.op ?? "eq")}
        onChange={(v) => update("op", v)}
        options={OP_OPTIONS}
      />
      <Input
        type="number"
        className="h-8 font-mono text-sm"
        value={rec.value !== undefined ? String(rec.value) : ""}
        placeholder="e.g. 100"
        onChange={(e) => update("value", e.target.value === "" ? "" : Number(e.target.value))}
      />
    </ConditionRow>
  );
}

import { useCallback, useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { KeyInput } from "./KeyInput.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { DateTimeInput } from "../common/DateTimeInput.js";
import { buildCustomCondition } from "./condition-builders.js";

export const OP_OPTIONS = [
  { value: "eq", label: "eq" },
  { value: "gt", label: "gt" },
  { value: "gte", label: "gte" },
  { value: "lt", label: "lt" },
  { value: "lte", label: "lte" },
];

export const meta = {
  type: "datetime",
  label: "Datetime",
  description: "Compare a context key against a date/time",
  defaults: { type: "datetime", key: "", op: "eq", value: new Date().toISOString() },
};

export function DatetimeConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
  const rec = useMemo(() => condition as Record<string, unknown>, [condition]);
  const update = useCallback(
    (field: string, value: unknown) => {
      onChange(buildCustomCondition({ ...rec, [field]: value, type: "datetime" }));
    },
    [rec, onChange],
  );

  return (
    <ConditionRow>
      <KeyInput
        value={String(rec.key ?? "")}
        onChange={(v) => update("key", v)}
        placeholder="e.g. at"
      />
      <OperatorSelect
        value={String(rec.op ?? "eq")}
        onChange={(v) => update("op", v)}
        options={OP_OPTIONS}
      />
      <DateTimeInput value={String(rec.value ?? "")} onChange={(v) => update("value", v)} />
    </ConditionRow>
  );
}

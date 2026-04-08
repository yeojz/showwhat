import { useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { DATETIME_OPS } from "./operator-labels.js";
import { DateTimeInput } from "../common/DateTimeInput.js";
import { buildCustomCondition } from "./condition-builders.js";

const ENDAT_OPS = DATETIME_OPS.filter((o) => o.value === "lt");

export const meta = {
  type: "endAt",
  label: "endAt",
  description: "Active before a specific date/time",
  defaults: { type: "endAt", value: new Date().toISOString() },
};

export function EndAtConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
  const rec = useMemo(() => condition as Record<string, unknown>, [condition]);

  return (
    <ConditionRow>
      <OperatorSelect value="lt" options={ENDAT_OPS} disabled />
      <DateTimeInput
        value={String(rec.value ?? "")}
        onChange={(v) => onChange(buildCustomCondition({ ...rec, value: v, type: "endAt" }))}
      />
    </ConditionRow>
  );
}

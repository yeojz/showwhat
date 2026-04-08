import { useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { DATETIME_OPS } from "./operator-labels.js";
import { DateTimeInput } from "../common/DateTimeInput.js";
import { buildCustomCondition } from "./condition-builders.js";

const STARTAT_OPS = DATETIME_OPS.filter((o) => o.value === "gte");

export const meta = {
  type: "startAt",
  label: "startAt",
  description: "Active after a specific date/time",
  defaults: { type: "startAt", value: new Date().toISOString() },
};

export function StartAtConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
  const rec = useMemo(() => condition as Record<string, unknown>, [condition]);

  return (
    <ConditionRow>
      <OperatorSelect value="gte" options={STARTAT_OPS} disabled />
      <DateTimeInput
        value={String(rec.value ?? "")}
        onChange={(v) => onChange(buildCustomCondition({ ...rec, value: v, type: "startAt" }))}
      />
    </ConditionRow>
  );
}

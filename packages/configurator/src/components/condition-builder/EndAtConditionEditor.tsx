import { useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { KeyInput } from "./KeyInput.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { DateTimeInput } from "../common/DateTimeInput.js";
import { buildCustomCondition } from "./condition-builders.js";

const OP_OPTIONS = [{ value: "lt", label: "lt" }];

export const meta = {
  type: "endAt",
  label: "End At",
  description: "Active before a specific date/time",
  defaults: { type: "endAt", value: new Date().toISOString() },
};

export function EndAtConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
  const rec = useMemo(() => condition as Record<string, unknown>, [condition]);

  return (
    <ConditionRow>
      <KeyInput value="at" disabled />
      <OperatorSelect value="lt" options={OP_OPTIONS} disabled />
      <DateTimeInput
        value={String(rec.value ?? "")}
        onChange={(v) => onChange(buildCustomCondition({ ...rec, value: v, type: "endAt" }))}
      />
    </ConditionRow>
  );
}

import { useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { KeyInput } from "./KeyInput.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { DateTimeInput } from "../common/DateTimeInput.js";
import { buildCustomCondition } from "./condition-builders.js";

const OP_OPTIONS = [{ value: "gte", label: "gte" }];

export const meta = {
  type: "startAt",
  label: "Start At",
  description: "Active after a specific date/time",
  defaults: { type: "startAt", value: new Date().toISOString() },
};

export function StartAtConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
  const rec = useMemo(() => condition as Record<string, unknown>, [condition]);

  return (
    <ConditionRow>
      <KeyInput value="at" disabled />
      <OperatorSelect value="gte" options={OP_OPTIONS} disabled />
      <DateTimeInput
        value={String(rec.value ?? "")}
        onChange={(v) => onChange(buildCustomCondition({ ...rec, value: v, type: "startAt" }))}
      />
    </ConditionRow>
  );
}

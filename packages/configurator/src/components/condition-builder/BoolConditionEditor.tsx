import { useCallback, useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { KeyInput } from "./KeyInput.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { BOOL_OPS } from "./operator-labels.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.js";
import { buildCustomCondition } from "./condition-builders.js";

export const meta = {
  type: "bool",
  label: "bool",
  description: "Match a context key against a boolean",
  defaults: { type: "bool", key: "", value: true },
};

export function BoolConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
  const rec = useMemo(() => condition as Record<string, unknown>, [condition]);
  const update = useCallback(
    (field: string, value: unknown) => {
      onChange(buildCustomCondition({ ...rec, [field]: value, type: "bool" }));
    },
    [rec, onChange],
  );

  return (
    <ConditionRow
      keySlot={
        <KeyInput
          value={String(rec.key ?? "")}
          onChange={(v) => update("key", v)}
          placeholder="e.g. isAdmin"
        />
      }
    >
      <OperatorSelect value="eq" options={BOOL_OPS} disabled />
      <Select
        value={String(rec.value ?? "true")}
        onValueChange={(v) => update("value", v === "true")}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    </ConditionRow>
  );
}

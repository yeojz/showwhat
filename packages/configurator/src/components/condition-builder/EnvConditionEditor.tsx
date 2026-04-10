import { useCallback, useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { BOOL_OPS } from "./operator-labels.js";
import { TagInput } from "./TagInput.js";
import { buildCustomCondition } from "./condition-builders.js";

export const meta = {
  type: "env",
  label: "env",
  description: "Match the environment name",
  defaults: { type: "env", value: "" },
};

export function EnvConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
  const rec = useMemo(() => condition as Record<string, unknown>, [condition]);
  const handleChange = useCallback(
    (value: string | string[]) => {
      onChange(buildCustomCondition({ ...rec, value, type: "env" }));
    },
    [rec, onChange],
  );

  return (
    <ConditionRow>
      <OperatorSelect value="eq" options={BOOL_OPS} disabled />
      <TagInput
        value={(rec.value as string | string[]) ?? ""}
        onChange={handleChange}
        placeholder="e.g. production"
      />
    </ConditionRow>
  );
}

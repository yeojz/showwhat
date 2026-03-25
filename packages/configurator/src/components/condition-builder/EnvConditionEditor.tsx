import { useCallback, useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { KeyInput } from "./KeyInput.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { TagInput } from "./TagInput.js";
import { buildCustomCondition } from "./condition-builders.js";

const OP_OPTIONS = [{ value: "eq", label: "eq" }];

export const meta = {
  type: "env",
  label: "Environment",
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
      <KeyInput value="env" disabled />
      <OperatorSelect value="eq" options={OP_OPTIONS} disabled />
      <TagInput
        value={(rec.value as string | string[]) ?? ""}
        onChange={handleChange}
        placeholder="e.g. production"
      />
    </ConditionRow>
  );
}

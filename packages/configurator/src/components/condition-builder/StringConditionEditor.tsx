import { useCallback, useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { KeyInput } from "./KeyInput.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { STRING_OPS } from "./operator-labels.js";
import { TagInput } from "./TagInput.js";
import { Input } from "../ui/input.js";
import { buildCustomCondition } from "./condition-builders.js";

export const meta = {
  type: "string",
  label: "string",
  description: "Match a context key against string value(s)",
  defaults: { type: "string", key: "", op: "eq", value: "" },
};

export function StringConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
  const rec = useMemo(() => condition as Record<string, unknown>, [condition]);
  const update = useCallback(
    (field: string, value: unknown) => {
      onChange(buildCustomCondition({ ...rec, [field]: value, type: "string" }));
    },
    [rec, onChange],
  );
  const handleOpChange = useCallback(
    (newOp: string) => {
      const isArrayOp = newOp === "in" || newOp === "nin";
      const currentValue = rec.value;
      const coercedValue = isArrayOp
        ? Array.isArray(currentValue)
          ? currentValue
          : currentValue
            ? [String(currentValue)]
            : []
        : Array.isArray(currentValue)
          ? ((currentValue as string[])[0] ?? "")
          : currentValue;
      onChange(buildCustomCondition({ ...rec, op: newOp, value: coercedValue, type: "string" }));
    },
    [rec, onChange],
  );
  const op = rec.op as string;
  const isArray = op === "in" || op === "nin";
  const isRegex = op === "regex";

  return (
    <ConditionRow
      keySlot={
        <KeyInput
          value={String(rec.key ?? "")}
          onChange={(v) => update("key", v)}
          placeholder="e.g. userId"
        />
      }
    >
      <OperatorSelect
        value={String(rec.op ?? "eq")}
        onChange={handleOpChange}
        options={STRING_OPS}
      />
      {isArray ? (
        <TagInput
          value={(rec.value as string | string[]) ?? ""}
          onChange={(v) => update("value", v)}
          placeholder="e.g. user-123"
        />
      ) : isRegex ? (
        <Input
          className="h-8 font-mono text-sm"
          value={String(rec.value ?? "")}
          placeholder="e.g. ^test.*$"
          onChange={(e) => update("value", e.target.value)}
        />
      ) : (
        <Input
          className="h-8 text-sm"
          value={String(rec.value ?? "")}
          placeholder="e.g. user-123"
          onChange={(e) => update("value", e.target.value)}
        />
      )}
    </ConditionRow>
  );
}

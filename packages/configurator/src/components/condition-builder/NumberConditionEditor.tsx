import { useCallback, useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { KeyInput } from "./KeyInput.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { NUMBER_OPS } from "./operator-labels.js";
import { NumberTagInput } from "./NumberTagInput.js";
import { Input } from "../ui/input.js";
import { buildCustomCondition } from "./condition-builders.js";

export const meta = {
  type: "number",
  label: "number",
  description: "Compare a context key against a number or list of numbers",
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
  const handleOpChange = useCallback(
    (newOp: string) => {
      const isArrayOp = newOp === "in" || newOp === "nin";
      const currentValue = rec.value;
      const coercedValue = isArrayOp
        ? Array.isArray(currentValue)
          ? currentValue
          : currentValue !== undefined && currentValue !== ""
            ? [Number(currentValue)]
            : []
        : Array.isArray(currentValue)
          ? ((currentValue as number[])[0] ?? 0)
          : currentValue;
      onChange(buildCustomCondition({ ...rec, op: newOp, value: coercedValue, type: "number" }));
    },
    [rec, onChange],
  );
  const op = rec.op as string;
  const isArray = op === "in" || op === "nin";

  return (
    <ConditionRow
      keySlot={
        <KeyInput
          value={String(rec.key ?? "")}
          onChange={(v) => update("key", v)}
          placeholder="e.g. score"
        />
      }
    >
      <OperatorSelect
        value={String(rec.op ?? "eq")}
        onChange={handleOpChange}
        options={NUMBER_OPS}
      />
      {isArray ? (
        <NumberTagInput
          value={(rec.value as number | number[]) ?? []}
          onChange={(v) => update("value", v)}
          placeholder="e.g. 200"
        />
      ) : (
        <Input
          type="number"
          className="h-8 font-mono text-sm"
          value={rec.value !== undefined ? String(rec.value) : ""}
          placeholder="e.g. 100"
          onChange={(e) => update("value", e.target.value === "" ? "" : Number(e.target.value))}
        />
      )}
    </ConditionRow>
  );
}

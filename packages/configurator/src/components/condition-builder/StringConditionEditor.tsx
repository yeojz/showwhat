import { useCallback, useMemo } from "react";
import type { ConditionValueEditorProps } from "../../types.js";
import { ConditionRow } from "./ConditionRow.js";
import { KeyInput } from "./KeyInput.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { TagInput } from "./TagInput.js";
import { Input } from "../ui/input.js";
import { buildCustomCondition } from "./condition-builders.js";

export const OP_OPTIONS = [
  { value: "eq", label: "eq" },
  { value: "neq", label: "neq" },
  { value: "regex", label: "regex" },
];

export const meta = {
  type: "string",
  label: "String",
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
  const isRegex = rec.op === "regex";

  return (
    <ConditionRow>
      <KeyInput
        value={String(rec.key ?? "")}
        onChange={(v) => update("key", v)}
        placeholder="e.g. userId"
      />
      <OperatorSelect
        value={String(rec.op ?? "eq")}
        onChange={(v) => update("op", v)}
        options={OP_OPTIONS}
      />
      {isRegex ? (
        <Input
          className="h-8 font-mono text-sm"
          value={String(rec.value ?? "")}
          placeholder="e.g. ^test.*$"
          onChange={(e) => update("value", e.target.value)}
        />
      ) : (
        <TagInput
          value={(rec.value as string | string[]) ?? ""}
          onChange={(v) => update("value", v)}
          placeholder="e.g. user-123"
        />
      )}
    </ConditionRow>
  );
}

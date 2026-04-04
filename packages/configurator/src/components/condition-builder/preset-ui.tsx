import { useCallback, useMemo } from "react";
import type { ComponentType } from "react";
import type { Presets } from "showwhat";

const PRIMITIVE_TYPES = new Set(["string", "number", "bool", "datetime"]);
const COMPOSITE_TYPES = new Set(["and", "or", "matchAnnotations"]);
import type { ConditionTypeMeta } from "./condition-registry.js";
import type { ConditionValueEditorProps } from "../../types.js";
import type { ConditionExtensions } from "./ConditionExtensionsContext.js";
import { ConditionRow } from "./ConditionRow.js";
import { KeyInput } from "./KeyInput.js";
import { OperatorSelect } from "./OperatorSelect.js";
import { TagInput } from "./TagInput.js";
import { NumberTagInput } from "./NumberTagInput.js";
import { Input } from "../ui/input.js";
import { DateTimeInput } from "../common/DateTimeInput.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.js";
import { buildCustomCondition } from "./condition-builders.js";
import { createCompositePresetEditor } from "./CompositePresetViewer.js";
import { OP_OPTIONS as STRING_OPS } from "./StringConditionEditor.js";
import { OP_OPTIONS as NUMBER_OPS } from "./NumberConditionEditor.js";
import { OP_OPTIONS as DATETIME_OPS } from "./DatetimeConditionEditor.js";
import { OP_OPTIONS as BOOL_OPS } from "./BoolConditionEditor.js";

// ── Default values per built-in type ─────────────────────────────────────────

const TYPE_DEFAULTS: Record<string, Record<string, unknown>> = {
  string: { op: "eq", value: "" },
  number: { op: "eq", value: 0 },
  bool: { value: true },
  datetime: { op: "eq", value: new Date().toISOString() },
};

// ── Meta generation ──────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function createPresetConditionMeta(presets: Presets): ConditionTypeMeta[] {
  return Object.entries(presets).map(([name, preset]) => {
    const isBuiltin = PRIMITIVE_TYPES.has(preset.type);
    const isComposite = COMPOSITE_TYPES.has(preset.type);

    const description = isComposite
      ? `Composite ${preset.type} preset`
      : isBuiltin
        ? `Match the ${preset.key} key (${preset.type})`
        : `Custom ${preset.type} condition`;

    const baseDefaults = isBuiltin ? { ...TYPE_DEFAULTS[preset.type], key: preset.key } : {};

    return {
      type: name,
      label: capitalize(name),
      description,
      defaults: { ...baseDefaults, ...preset.overrides, type: name },
    };
  });
}

// ── Preset editor component factory ──────────────────────────────────────────

export function createPresetEditor(
  presetName: string,
  builtinType: string,
  presetKey: string,
  overrides: Record<string, unknown> = {},
): ComponentType<ConditionValueEditorProps> {
  const lockedFields = new Set(Object.keys(overrides));

  function PresetConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
    const rec = useMemo(() => condition as Record<string, unknown>, [condition]);
    const update = useCallback(
      (field: string, value: unknown) => {
        onChange(
          buildCustomCondition({
            ...rec,
            [field]: value,
            ...overrides,
            key: presetKey,
            type: presetName,
          }),
        );
      },
      [rec, onChange],
    );

    switch (builtinType) {
      case "string": {
        const op = rec.op as string;
        const isArray = op === "in" || op === "nin";
        const isRegex = op === "regex";
        const handleOpChange = (newOp: string) => {
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
          onChange(
            buildCustomCondition({
              ...rec,
              op: newOp,
              value: coercedValue,
              key: presetKey,
              type: presetName,
            }),
          );
        };
        const opLocked = lockedFields.has("op");
        const valueLocked = lockedFields.has("value");
        return (
          <ConditionRow>
            <KeyInput value={presetKey} disabled />
            <OperatorSelect
              value={String(rec.op ?? "eq")}
              onChange={handleOpChange}
              options={STRING_OPS}
              disabled={opLocked}
            />
            {isArray ? (
              <TagInput
                value={(rec.value as string | string[]) ?? ""}
                onChange={(v) => update("value", v)}
                placeholder={`e.g. ${presetKey} value`}
                disabled={valueLocked}
              />
            ) : isRegex ? (
              <Input
                className="h-8 font-mono text-sm"
                value={String(rec.value ?? "")}
                placeholder="e.g. ^test.*$"
                onChange={(e) => update("value", e.target.value)}
                disabled={valueLocked}
              />
            ) : (
              <Input
                className="h-8 text-sm"
                value={String(rec.value ?? "")}
                placeholder={`e.g. ${presetKey} value`}
                onChange={(e) => update("value", e.target.value)}
                disabled={valueLocked}
              />
            )}
          </ConditionRow>
        );
      }
      case "number": {
        const numOp = rec.op as string;
        const isNumArray = numOp === "in" || numOp === "nin";
        const handleNumOpChange = (newOp: string) => {
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
          onChange(
            buildCustomCondition({
              ...rec,
              op: newOp,
              value: coercedValue,
              key: presetKey,
              type: presetName,
            }),
          );
        };
        const numOpLocked = lockedFields.has("op");
        const numValueLocked = lockedFields.has("value");
        return (
          <ConditionRow>
            <KeyInput value={presetKey} disabled />
            <OperatorSelect
              value={String(rec.op ?? "eq")}
              onChange={handleNumOpChange}
              options={NUMBER_OPS}
              disabled={numOpLocked}
            />
            {isNumArray ? (
              <NumberTagInput
                value={(rec.value as number | number[]) ?? []}
                onChange={(v) => update("value", v)}
                placeholder={`e.g. ${presetKey} value`}
                disabled={numValueLocked}
              />
            ) : (
              <Input
                type="number"
                className="h-8 font-mono text-sm"
                value={rec.value !== undefined ? String(rec.value) : ""}
                placeholder="e.g. 100"
                onChange={(e) =>
                  update("value", e.target.value === "" ? "" : Number(e.target.value))
                }
                disabled={numValueLocked}
              />
            )}
          </ConditionRow>
        );
      }
      case "bool": {
        const boolValueLocked = lockedFields.has("value");
        return (
          <ConditionRow>
            <KeyInput value={presetKey} disabled />
            <OperatorSelect value="eq" options={BOOL_OPS} disabled />
            <Select
              value={String(rec.value ?? "true")}
              onValueChange={(v) => update("value", v === "true")}
              disabled={boolValueLocked}
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
      case "datetime": {
        const dtOpLocked = lockedFields.has("op");
        const dtValueLocked = lockedFields.has("value");
        return (
          <ConditionRow>
            <KeyInput value={presetKey} disabled />
            <OperatorSelect
              value={String(rec.op ?? "eq")}
              onChange={(v) => update("op", v)}
              options={DATETIME_OPS}
              disabled={dtOpLocked}
            />
            <DateTimeInput
              value={String(rec.value ?? "")}
              onChange={(v) => update("value", v)}
              disabled={dtValueLocked}
            />
          </ConditionRow>
        );
      }
    }
    return null;
  }

  PresetConditionEditor.displayName = `PresetConditionEditor(${presetName})`;
  return PresetConditionEditor;
}

// ── Convenience factory ──────────────────────────────────────────────────────

export function createPresetUI(presets: Presets): ConditionExtensions {
  const extraConditionTypes = createPresetConditionMeta(presets);
  const editorOverrides = new Map<string, ComponentType<ConditionValueEditorProps>>();

  for (const [name, preset] of Object.entries(presets)) {
    if (COMPOSITE_TYPES.has(preset.type)) {
      const conditions = (preset.overrides?.conditions ?? []) as unknown[];
      editorOverrides.set(name, createCompositePresetEditor(name, preset.type, conditions));
    } else if (PRIMITIVE_TYPES.has(preset.type) && preset.key) {
      editorOverrides.set(
        name,
        createPresetEditor(name, preset.type, preset.key, preset.overrides),
      );
    }
  }

  return { extraConditionTypes, editorOverrides };
}

import { useCallback, useRef, useState } from "react";
import { Input } from "../ui/input.js";
import { Label } from "../ui/label.js";
import { Textarea } from "../ui/textarea.js";
import type { ConditionValueEditorProps } from "../../types.js";

function extractArgs(condition: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(condition).filter(([k]) => k !== "type" && k !== "id"));
}

function argsToText(args: Record<string, unknown>): string {
  if (Object.keys(args).length === 0) return "";
  return JSON.stringify(args, null, 2);
}

export function CustomConditionEditor({ condition, onChange }: ConditionValueEditorProps) {
  const rec = condition as Record<string, unknown>;

  const [text, setText] = useState(() => argsToText(extractArgs(rec)));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const focusedRef = useRef(false);

  const prevConditionRef = useRef(condition);
  if (prevConditionRef.current !== condition) {
    prevConditionRef.current = condition;
    if (!focusedRef.current) {
      const derived = argsToText(extractArgs(rec));
      if (derived !== text) {
        setText(derived);
        setJsonError(null);
      }
    }
  }

  const handleArgsBlur = useCallback(() => {
    focusedRef.current = false;
    const trimmed = text.trim();

    if (trimmed === "") {
      setJsonError(null);
      onChange({ type: rec.type, ...(rec.id ? { id: rec.id } : {}) } as typeof condition);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setJsonError("Args must be a JSON object");
        return;
      }
      setJsonError(null);
      onChange({
        type: rec.type,
        ...(rec.id ? { id: rec.id } : {}),
        ...parsed,
      } as typeof condition);
    } catch {
      setJsonError("Invalid JSON");
    }
  }, [text, rec.type, rec.id, onChange]);

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...rec, type: e.target.value } as typeof condition);
    },
    [rec, onChange],
  );

  return (
    <div className="flex-1 space-y-2">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <Input
          className="h-8 font-mono text-sm"
          value={String(rec.type ?? "")}
          placeholder="e.g. geoLocation, percentage"
          onChange={handleTypeChange}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Args</Label>
        <Textarea
          className="font-mono text-sm"
          rows={3}
          value={text}
          placeholder='e.g. {"region": "us-east", "threshold": 50} (optional)'
          onChange={(e) => {
            setText(e.target.value);
            setJsonError(null);
          }}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={handleArgsBlur}
        />
        {jsonError && <p className="mt-1 text-xs text-destructive">{jsonError}</p>}
      </div>
    </div>
  );
}

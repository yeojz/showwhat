import { useRef, useState } from "react";
import { Input } from "../ui/input.js";
import { Textarea } from "../ui/textarea.js";
import { Button } from "../ui/button.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.js";
import type { ValueInputProps } from "../../types.js";

type ValueType = "string" | "number" | "boolean" | "json";

function detectType(value: unknown): ValueType {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "object" && value !== null) return "json";
  return "string";
}

export function ValueInput({ value, onChange, placeholder }: ValueInputProps) {
  const [type, setType] = useState<ValueType>(() => detectType(value));
  const [jsonText, setJsonText] = useState(() =>
    type === "json" ? JSON.stringify(value, null, 2) : "",
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Sync type and jsonText only when the value prop changes type from outside
  // (e.g. parent switches which variation is selected)
  const prevValueRef = useRef(value);
  if (prevValueRef.current !== value) {
    prevValueRef.current = value;
    const newType = detectType(value);
    if (newType !== type) {
      setType(newType);
    }
    if (newType === "json") {
      try {
        setJsonText(JSON.stringify(value, null, 2));
        setJsonError(null);
      } catch {
        /* keep current jsonText */
      }
    }
  }

  function handleTypeChange(newType: string) {
    const t = newType as ValueType;
    setType(t);
    setJsonError(null);
    switch (t) {
      case "string":
        onChange(String(value ?? ""));
        break;
      case "number":
        onChange(Number(value) || 0);
        break;
      case "boolean":
        onChange(Boolean(value));
        break;
      case "json":
        try {
          const text = JSON.stringify(value, null, 2);
          setJsonText(text);
          onChange(value);
          /* v8 ignore start */
        } catch {
          setJsonText("{}");
          onChange({});
        }
        /* v8 ignore stop */
        break;
    }
  }

  function handleJsonBlur() {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      onChange(parsed);
    } catch {
      setJsonError("Invalid JSON");
    }
  }

  function handlePrettify() {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON");
    }
  }

  return (
    <div className="flex items-start gap-2">
      <Select value={type} onValueChange={(v) => handleTypeChange(v as string)}>
        <SelectTrigger className="h-9 w-[110px] shrink-0 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="string">String</SelectItem>
          <SelectItem value="number">Number</SelectItem>
          <SelectItem value="boolean">Boolean</SelectItem>
          <SelectItem value="json">JSON</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex-1">
        {type === "string" && (
          <Input
            className="h-9 font-mono text-sm"
            value={String(value ?? "")}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {type === "number" && (
          <Input
            className="h-9 font-mono text-sm"
            type="number"
            value={String(value ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        )}
        {type === "boolean" && (
          <Select value={String(Boolean(value))} onValueChange={(v) => onChange(v === "true")}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        )}
        {type === "json" && (
          <>
            <Textarea
              className="font-mono text-sm"
              rows={4}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              onBlur={handleJsonBlur}
            />
            <div className="mt-1 flex items-center gap-2">
              {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-6 px-2 text-xs"
                onClick={handlePrettify}
              >
                Prettify
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

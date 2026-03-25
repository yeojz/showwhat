import { useRef, useState } from "react";
import { Calendar, Code } from "lucide-react";
import { Input } from "../ui/input.js";
import type { DateTimeInputProps } from "../../types.js";

function toLocalDatetime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return `${date}T${time}`;
}

function fromLocalDatetime(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return local;
  return d.toISOString();
}

export function DateTimeInput({ value, onChange }: DateTimeInputProps) {
  const [rawValue, setRawValue] = useState(value);
  const [showRaw, setShowRaw] = useState(false);
  const prevValueRef = useRef(value);
  if (prevValueRef.current !== value) {
    prevValueRef.current = value;
    setRawValue(value);
  }

  if (showRaw) {
    return (
      <div className="flex gap-1">
        <Input
          className="h-8 flex-1 font-mono text-xs"
          value={rawValue}
          placeholder="ISO 8601 datetime"
          onChange={(e) => {
            setRawValue(e.target.value);
            onChange(e.target.value);
          }}
        />
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground"
          aria-label="Switch to date picker"
          onClick={() => setShowRaw(false)}
        >
          <Calendar className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <Input
        className="h-8 flex-1 text-xs"
        type="datetime-local"
        value={toLocalDatetime(value)}
        onChange={(e) => onChange(fromLocalDatetime(e.target.value))}
      />
      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground"
        aria-label="Switch to raw input"
        onClick={() => {
          setRawValue(value);
          setShowRaw(true);
        }}
      >
        <Code className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

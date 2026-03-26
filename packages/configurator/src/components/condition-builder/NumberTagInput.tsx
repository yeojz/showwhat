import { useCallback, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Badge } from "../ui/badge.js";

type NumberTagInputProps = {
  value: number | number[];
  onChange: (value: number | number[]) => void;
  placeholder?: string;
};

export function NumberTagInput({ value, onChange, placeholder }: NumberTagInputProps) {
  const values = Array.isArray(value) ? value : [value];
  const [text, setText] = useState("");

  const emit = useCallback(
    (next: number[]) => {
      onChange(next.length === 1 ? next[0] : next);
    },
    [onChange],
  );

  const addValues = useCallback(
    (raw: string[]) => {
      const parsed = raw
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n));
      const unique = parsed.filter((n) => !values.includes(n));
      if (unique.length > 0) {
        emit([...values, ...unique]);
      }
    },
    [values, emit],
  );

  const removeValue = useCallback(
    (index: number) => {
      const next = values.filter((_, i) => i !== index);
      emit(next.length === 0 ? [] : next);
    },
    [values, emit],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || (e.key === "Tab" && text.trim())) {
        e.preventDefault();
        addValues([text]);
        setText("");
      } else if (e.key === "Backspace" && text === "" && values.length > 0) {
        removeValue(values.length - 1);
      }
    },
    [text, values, addValues, removeValue],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text");
      if (pasted.includes("\n")) {
        e.preventDefault();
        addValues(pasted.split("\n"));
        setText("");
      }
    },
    [addValues],
  );

  return (
    <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 flex-1 flex-wrap items-center gap-1 rounded-md border px-2 py-1 focus-within:ring-[3px]">
      {values.map((v, i) => (
        <Badge key={`${v}-${i}`} variant="outline" className="bg-muted gap-1 font-mono text-xs">
          {v}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground ml-0.5 cursor-pointer leading-none"
            onClick={() => removeValue(i)}
            aria-label={`Remove ${v}`}
          >
            {"\u00d7"}
          </button>
        </Badge>
      ))}
      <input
        className="min-w-[80px] flex-1 bg-transparent py-0.5 font-mono text-sm outline-none placeholder:text-muted-foreground"
        type="number"
        value={text}
        placeholder={values.length === 0 ? (placeholder ?? "type and press Enter") : ""}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  );
}

import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select.js";
import type { OperatorOption } from "./operator-labels.js";

type OperatorSelectProps = {
  value: string;
  onChange?: (value: string) => void;
  options: OperatorOption[];
  disabled?: boolean;
};

export function OperatorSelect({ value, onChange, options, disabled }: OperatorSelectProps) {
  const selected = options.find((o) => o.value === value);

  return (
    <Select value={value} onValueChange={(v) => onChange?.(v as string)} disabled={disabled}>
      <SelectTrigger className="h-8 w-full text-xs" disabled={disabled}>
        <span className="truncate">{selected?.label ?? value}</span>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span>{opt.label}</span>
            {opt.code && <span className="ml-1.5 text-muted-foreground">({opt.code})</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

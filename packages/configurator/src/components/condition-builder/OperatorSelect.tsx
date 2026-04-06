import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.js";

type OperatorSelectProps = {
  value: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
};

export function OperatorSelect({ value, onChange, options, disabled }: OperatorSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange?.(v as string)} disabled={disabled}>
      <SelectTrigger className="h-8 font-mono text-xs" disabled={disabled}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

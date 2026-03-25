import { Input } from "../ui/input.js";

type KeyInputProps = {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function KeyInput({ value, onChange, placeholder, disabled }: KeyInputProps) {
  return (
    <Input
      className="h-8 font-mono text-sm"
      value={value}
      placeholder={placeholder ?? "key"}
      disabled={disabled}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      readOnly={!onChange}
    />
  );
}

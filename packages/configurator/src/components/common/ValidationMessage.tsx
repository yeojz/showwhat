import type { ValidationMessageProps } from "../../types.js";

export function ValidationMessage({ errors }: ValidationMessageProps) {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="space-y-1">
      {errors.map((err, i) => (
        <p key={i} className="text-xs text-destructive">
          {err.path.length > 0 && (
            <span className="font-mono text-destructive/70">{err.path.join(".")} </span>
          )}
          {err.message}
        </p>
      ))}
    </div>
  );
}

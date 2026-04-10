import type { ReactNode } from "react";
import { useConditionBlockChrome } from "./ConditionBlockContext.js";

type ConditionRowProps = {
  /** Optional key input rendered in its own row between badge header and operator row. */
  keySlot?: ReactNode;
  /** Operator + value rendered in the bottom row. */
  children: ReactNode;
};

export function ConditionRow({ keySlot, children }: ConditionRowProps) {
  const chrome = useConditionBlockChrome();

  return (
    <div className="space-y-1.5">
      {/* Row 1: badge + controls header */}
      {chrome && (
        <div className="flex items-center gap-2">
          {chrome.typeBadge}
          <div className="flex-1" />
          {chrome.controls}
        </div>
      )}

      {/* Row 2 (optional): key input — full width */}
      {keySlot && <div>{keySlot}</div>}

      {/* Row 3: operator + value */}
      <div
        className="grid items-start gap-2"
        style={{ gridTemplateColumns: "minmax(8rem, auto) 1fr" }}
      >
        {children}
      </div>
    </div>
  );
}

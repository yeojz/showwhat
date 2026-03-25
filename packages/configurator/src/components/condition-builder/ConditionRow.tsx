import type { ReactNode } from "react";

type ConditionRowProps = {
  children: ReactNode;
};

export function ConditionRow({ children }: ConditionRowProps) {
  return (
    <div
      className="grid flex-1 items-start gap-2"
      style={{ gridTemplateColumns: "140px 72px 1fr" }}
    >
      {children}
    </div>
  );
}

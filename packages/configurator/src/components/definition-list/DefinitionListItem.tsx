import { memo } from "react";
import { Badge } from "../ui/badge.js";
import { cn } from "../../utils/cn.js";
import type { DefinitionListItemProps } from "../../types.js";

const STATUS_CLASSES = {
  unfetched: "border-muted-foreground/40 bg-muted-foreground/40",
  error: "border-status-error bg-status-error",
  error_dirty: "border-status-error bg-transparent",
  active: "border-status-active bg-status-active",
  active_dirty: "border-status-active bg-transparent",
  inactive: "border-status-inactive bg-status-inactive",
  inactive_dirty: "border-status-inactive bg-transparent",
};

export const DefinitionListItem = memo(function DefinitionListItem({
  definitionKey,
  variationCount,
  isActive,
  hasErrors,
  isSelected,
  isDirty,
  onSelect,
}: DefinitionListItemProps) {
  const isUnfetched = isActive === undefined;

  function getStatusLabel() {
    if (isUnfetched) return `${definitionKey} is unfetched`;
    const state = hasErrors ? "error" : isActive ? "active" : "inactive";
    const dirty = isDirty ? ", unsaved changes" : "";
    return `${definitionKey} is ${state}${dirty}`;
  }

  return (
    <div
      tabIndex={0}
      className={cn(
        "group flex w-full items-center gap-2 rounded border-l-2 px-3 py-2.5 text-left text-sm transition-colors cursor-pointer",
        isSelected
          ? "border-l-primary bg-accent text-accent-foreground"
          : "border-l-transparent hover:bg-muted",
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span
        role="status"
        aria-label={getStatusLabel()}
        className={cn(
          "h-2 w-2 shrink-0 rounded-full border-[1.5px]",
          isUnfetched
            ? STATUS_CLASSES.unfetched
            : hasErrors
              ? isDirty
                ? STATUS_CLASSES.error_dirty
                : STATUS_CLASSES.error
              : isActive
                ? isDirty
                  ? STATUS_CLASSES.active_dirty
                  : STATUS_CLASSES.active
                : isDirty
                  ? STATUS_CLASSES.inactive_dirty
                  : STATUS_CLASSES.inactive,
        )}
      />
      <span className="min-w-0 flex-1 break-all font-mono text-sm">{definitionKey}</span>
      {variationCount !== undefined && (
        <Badge variant="secondary" className="text-xs tabular-nums">
          {variationCount}
        </Badge>
      )}
    </div>
  );
});

import { memo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import { ConfirmDialog } from "../common/ConfirmDialog.js";
import { cn } from "../../utils/cn.js";
import type { DefinitionListItemProps } from "../../types.js";

export const DefinitionListItem = memo(function DefinitionListItem({
  definitionKey,
  variationCount,
  isActive,
  hasErrors,
  isSelected,
  isDirty,
  onSelect,
  onRemove,
}: DefinitionListItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

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
        aria-label={`${definitionKey} is ${hasErrors ? "error" : isActive ? "active" : "inactive"}${isDirty ? ", unsaved changes" : ""}`}
        className={cn(
          "h-2 w-2 shrink-0 rounded-full border-[1.5px]",
          hasErrors
            ? isDirty
              ? "border-status-error bg-transparent"
              : "border-status-error bg-status-error"
            : isActive
              ? isDirty
                ? "border-status-active bg-transparent"
                : "border-status-active bg-status-active"
              : isDirty
                ? "border-status-inactive bg-transparent"
                : "border-status-inactive bg-status-inactive",
        )}
      />
      <span className="flex-1 truncate font-mono text-sm">{definitionKey}</span>
      <Badge variant="secondary" className="text-xs tabular-nums">
        {variationCount}
      </Badge>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete definition?"
        description={
          <>
            This will permanently delete <strong className="font-mono">{definitionKey}</strong> and
            all its variations. This action cannot be undone.
          </>
        }
        actionLabel="Delete"
        onConfirm={onRemove}
      >
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-destructive/60 opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label={`Remove ${definitionKey}`}
          onClick={(e) => {
            e.stopPropagation();
            setConfirmOpen(true);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </ConfirmDialog>
    </div>
  );
});

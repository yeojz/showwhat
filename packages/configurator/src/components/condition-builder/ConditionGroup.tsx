import type { Condition } from "showwhat";
import { X } from "lucide-react";
import { Button } from "../ui/button.js";
import { Badge } from "../ui/badge.js";
import { ConditionBlock } from "./ConditionBlock.js";
import { AddConditionMenu } from "./AddConditionMenu.js";
import { MoveButtons } from "./MoveButtons.js";
import type { ConditionGroupProps } from "../../types.js";
import { filterErrorsByPath } from "../../utils/validation-errors.js";
import { cn } from "../../utils/cn.js";
import { useConditionArray } from "./useConditionArray.js";

import { Fragment, memo } from "react";

const GROUP_TYPE_CLASSES = {
  and: { border: "border-primary/30", badge: "bg-primary/10 text-primary border-primary/20" },
  or: {
    border: "border-amber-500/30",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  default: {
    border: "border-violet-500/30",
    badge: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
  },
};

function getGroupTypeClasses(type: string) {
  return GROUP_TYPE_CLASSES[type as keyof typeof GROUP_TYPE_CLASSES] ?? GROUP_TYPE_CLASSES.default;
}

export const ConditionGroup = memo(function ConditionGroup({
  type,
  conditions: rawConditions,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  depth = 0,
  errors,
}: ConditionGroupProps) {
  const {
    conditions,
    handleConditionChange,
    handleConditionRemove,
    handleMoveUp,
    handleMoveDown,
    handleAddCondition,
  } = useConditionArray(rawConditions, onChange);

  return (
    <div
      className={cn("border-l-3 pl-3 pr-2 py-2 rounded-r-md", getGroupTypeClasses(type).border)}
      style={{
        backgroundColor: `oklch(from var(--color-muted) l c h / ${Math.min(0.2 + depth * 0.1, 0.5)})`,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Badge
          variant="outline"
          className="select-none font-mono text-xs bg-muted/50 text-muted-foreground border-border"
        >
          L{depth} | {type}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {conditions.length} condition{conditions.length !== 1 ? "s" : ""}
        </span>
        <div className="flex-1" />
        <div className="flex shrink-0 gap-0.5">
          <MoveButtons onMoveUp={onMoveUp} onMoveDown={onMoveDown} size="h-6 w-6" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove condition group"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        {conditions.map((c, i) => (
          <Fragment key={(c as Record<string, unknown>).id as string}>
            {i > 0 && (
              <div className="flex">
                <Badge
                  variant="outline"
                  className={cn("select-none font-mono text-xs", getGroupTypeClasses(type).badge)}
                >
                  {type === "matchAnnotations" ? "and" : type}
                </Badge>
              </div>
            )}
            <ConditionBlock
              condition={c}
              onChange={(updated: Condition) => handleConditionChange(i, updated)}
              onRemove={() => handleConditionRemove(i)}
              onMoveUp={i > 0 ? () => handleMoveUp(i) : undefined}
              onMoveDown={i < conditions.length - 1 ? () => handleMoveDown(i) : undefined}
              depth={depth + 1}
              errors={filterErrorsByPath(errors, "conditions", i)}
            />
          </Fragment>
        ))}
      </div>
      <div className="mt-2">
        <AddConditionMenu onAdd={handleAddCondition} />
      </div>
    </div>
  );
});

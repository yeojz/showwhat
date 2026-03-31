import { Fragment } from "react";
import type { Condition } from "showwhat";
import { Badge } from "../ui/badge.js";
import { ConditionBlock } from "./ConditionBlock.js";
import { AddConditionMenu } from "./AddConditionMenu.js";
import type { ConditionBuilderProps } from "../../types.js";
import { filterErrorsByPath } from "../../utils/validation-errors.js";
import { useConditionArray } from "./useConditionArray.js";
import { ErrorBoundary } from "../common/ErrorBoundary.js";

export function ConditionBuilder({
  conditions: rawConditions,
  onChange,
  validationErrors,
}: ConditionBuilderProps) {
  const {
    conditions,
    handleConditionChange,
    handleConditionRemove,
    handleMoveUp,
    handleMoveDown,
    handleAddCondition,
  } = useConditionArray(rawConditions, onChange);

  return (
    <ErrorBoundary>
      <div className="space-y-1.5">
        {conditions.length > 0 && (
          <div className="border-l-3 pl-3 py-2 bg-muted/20 rounded-r-md border-primary/30">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {conditions.length} condition{conditions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1.5">
              {conditions.map((c, i) => (
                <Fragment key={(c as Record<string, unknown>).id as string}>
                  {i > 0 && (
                    <div className="flex">
                      <Badge
                        variant="outline"
                        className="select-none font-mono text-xs bg-primary/10 text-primary border-primary/20"
                      >
                        and
                      </Badge>
                    </div>
                  )}
                  <ConditionBlock
                    condition={c}
                    onChange={(updated: Condition) => handleConditionChange(i, updated)}
                    onRemove={() => handleConditionRemove(i)}
                    onMoveUp={i > 0 ? () => handleMoveUp(i) : undefined}
                    onMoveDown={i < conditions.length - 1 ? () => handleMoveDown(i) : undefined}
                    depth={1}
                    errors={filterErrorsByPath(validationErrors, "conditions", i)}
                  />
                </Fragment>
              ))}
            </div>
          </div>
        )}
        <AddConditionMenu onAdd={handleAddCondition} />
      </div>
    </ErrorBoundary>
  );
}

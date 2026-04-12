import { memo } from "react";
import type { Condition } from "showwhat";
import { isAndCondition, isOrCondition, isCheckAnnotationsCondition } from "showwhat";
import { X } from "lucide-react";
import { Button } from "../ui/button.js";
import { ConditionValueEditor } from "./ConditionValueEditor.js";
import { ConditionGroup } from "./ConditionGroup.js";
import { MoveButtons } from "./MoveButtons.js";
import { getConditionMeta } from "./condition-registry.js";
import { useConditionExtensions } from "./ConditionExtensionsContext.js";
import { ConditionBlockProvider } from "./ConditionBlockContext.js";
import { buildAndCondition, buildOrCondition, buildCheckAnnotationsCondition } from "./utils.js";
import type { ConditionBlockProps } from "../../types.js";

/** Zod emits "Invalid input" for discriminated union failures — we rephrase for clarity. */
const GENERIC_ZOD_ERROR = "Invalid input";

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-muted px-2 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}

export const ConditionBlock = memo(function ConditionBlock({
  condition,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  depth = 0,
  errors,
}: ConditionBlockProps) {
  function handleChange(updated: Condition) {
    onChange(updated);
  }
  // Render AND/OR/checkAnnotations groups recursively
  if (
    isAndCondition(condition) ||
    isOrCondition(condition) ||
    isCheckAnnotationsCondition(condition)
  ) {
    return (
      <ConditionGroup
        type={condition.type as "and" | "or" | "checkAnnotations"}
        conditions={condition.conditions}
        onChange={(conditions) =>
          handleChange(
            condition.type === "and"
              ? buildAndCondition(conditions, condition.id)
              : condition.type === "or"
                ? buildOrCondition(conditions, condition.id)
                : buildCheckAnnotationsCondition(conditions, condition.id),
          )
        }
        onRemove={onRemove}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        depth={depth}
        errors={errors}
      />
    );
  }

  const extensions = useConditionExtensions();
  const meta =
    getConditionMeta(condition.type) ??
    extensions?.extraConditionTypes.find((m) => m.type === condition.type);
  const label = meta?.label ?? (condition.type || "Custom");

  const typeBadge = <TypeBadge label={label} />;
  const controls = (
    <div className="flex shrink-0 gap-0.5">
      <MoveButtons onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
        onClick={onRemove}
        aria-label="Remove condition"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="border border-border bg-card p-2 space-y-2">
      <ConditionBlockProvider typeBadge={typeBadge} controls={controls}>
        <ConditionValueEditor condition={condition} onChange={handleChange} />
      </ConditionBlockProvider>
      {(errors?.length ?? 0) > 0 && (
        <div className="space-y-0.5">
          {errors!.map((err, i) => {
            const field = err.path.length > 0 ? err.path.join(".") : null;
            const msg =
              err.message === GENERIC_ZOD_ERROR
                ? "Invalid condition — check required fields"
                : err.message;
            return (
              <p key={i} className="text-xs text-destructive">
                {field && <span className="font-mono text-destructive/70">{field}: </span>}
                {msg}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
});

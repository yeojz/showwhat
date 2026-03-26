import { memo, useState } from "react";
import type { Condition } from "showwhat";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { ChevronRight, Eye, GripVertical, Trash2 } from "lucide-react";
import { Button } from "../ui/button.js";
import { Label } from "../ui/label.js";
import { Badge } from "../ui/badge.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog.js";
import { ConfirmDialog } from "../common/ConfirmDialog.js";
import { ValueInput } from "../common/ValueInput.js";
import { ValidationMessage } from "../common/ValidationMessage.js";
import { ConditionBuilder } from "../condition-builder/ConditionBuilder.js";
import { formatConditionSummary } from "../../utils/condition-summary.js";
import type { VariationCardProps } from "../../types.js";

export const VariationCard = memo(function VariationCard({
  variation,
  index,
  validationErrors,
  onChange,
  onRemove,
  dragHandleProps,
}: VariationCardProps) {
  const [open, setOpen] = useState(false);
  const conditionCount = variation.conditions?.length ?? 0;

  return (
    <CollapsiblePrimitive.Root open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border/50 bg-card transition-colors hover:border-primary/30">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground"
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <CollapsiblePrimitive.Trigger asChild>
            <button
              type="button"
              className="flex flex-1 items-center gap-2 text-left hover:cursor-pointer"
            >
              <Badge variant="secondary" className="font-mono text-xs">
                {index}
              </Badge>
              <span className="flex-1 truncate text-sm text-muted-foreground">
                {variation.description || String(variation.value ?? "")}
              </span>
              {conditionCount > 0 && (
                <span className="text-xs text-muted-foreground/60">
                  {conditionCount} {conditionCount === 1 ? "condition" : "conditions"}
                </span>
              )}
              <ChevronRight
                className={`h-4 w-4 text-muted-foreground/60 transition-transform ${open ? "rotate-90" : ""}`}
              />
            </button>
          </CollapsiblePrimitive.Trigger>
        </div>
        <CollapsiblePrimitive.Content>
          <div className="space-y-4 border-t border-border/40 px-4 py-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Value
              </Label>
              <ConfirmDialog
                title="Remove variation?"
                description={`This will delete variation ${index} and all its conditions. This action cannot be undone.`}
                actionLabel="Remove"
                onConfirm={onRemove}
              >
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove variation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </ConfirmDialog>
            </div>
            <div>
              <ValueInput
                value={variation.value}
                onChange={(value) => onChange({ ...variation, value })}
              />
            </div>
            <input
              className="w-full border-none bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:text-foreground focus:outline-none"
              value={variation.description ?? ""}
              placeholder="Add a description (optional)..."
              onChange={(e) =>
                onChange({
                  ...variation,
                  description: e.target.value || undefined,
                })
              }
            />
            <div className="border-t border-border/40 pt-4">
              <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Label className="text-sm font-medium">Conditions</Label>
                  {conditionCount > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground/60 hover:text-muted-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Condition Summary</DialogTitle>
                          <DialogDescription>Evaluation logic for this variation</DialogDescription>
                        </DialogHeader>
                        <pre className="rounded-md bg-muted p-4 font-mono text-xs whitespace-pre overflow-auto max-h-80">
                          {formatConditionSummary(variation.conditions ?? [])}
                        </pre>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <ConditionBuilder
                  conditions={variation.conditions ?? []}
                  onChange={(conditions: Condition[]) =>
                    onChange({
                      ...variation,
                      conditions: conditions.length > 0 ? conditions : undefined,
                    })
                  }
                  validationErrors={validationErrors}
                />
              </div>
            </div>
            <ValidationMessage
              errors={validationErrors?.filter((err) => err.path[0] !== "conditions")}
            />
          </div>
        </CollapsiblePrimitive.Content>
      </div>
    </CollapsiblePrimitive.Root>
  );
});
